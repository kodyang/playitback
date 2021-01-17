require = require('esm')(module)

const MP3_FILE_INPUT = "mp3";
const FLAC = "flac";
const ROOT_FILE_STORAGE_PATH = "./storage/";
const FLAC_FILE_OUTPUT_FOLDER = ROOT_FILE_STORAGE_PATH + `${FLAC}`;
const AUDIO_TRANSCRIPTS_OUTPUT = ROOT_FILE_STORAGE_PATH + "audioTranscripts";

const transcribeMp3File = async (fileNameNoExt) => {
    // Setup libraries
    const speech = require('@google-cloud/speech');
    const { Storage } = require('@google-cloud/storage');
    
    // File paths
    // const fileNameNoExt = fileNameWithExt.split(".")[0]
    const fileNameWithFlacExt = `${fileNameNoExt}.flac`;
    const LOCAL_MP3_FILE_PATH = ROOT_FILE_STORAGE_PATH + `${MP3_FILE_INPUT}/${fileNameNoExt}.mp3`;
    const LOCAL_FLAC_FILE_PATH = ROOT_FILE_STORAGE_PATH + `${FLAC}/${fileNameNoExt}.flac`;


    //  Convert file to flac audio encoding
    const status = await convertToFlac(LOCAL_MP3_FILE_PATH, fileNameNoExt);
    console.log(status);

    // Storage constants
    const GOOGLE_CLOUD_PROJECT_ID = 'annular-accord-301902';
    // const GOOGLE_CLOUD_KEYFILE = './annular-accord-301902-9cc95c4a93f2.json';
    const DEFAULT_BUCKET = 'oliver-hack-the-north';
    // const FILE_NAME = LOCAL_FLAC_FILE_PATH.slice(13);

    const storage = new Storage({
        projectId: GOOGLE_CLOUD_PROJECT_ID
        // keyFilename: GOOGLE_CLOUD_KEYFILE
    })

    // Upload file from local to GCS
    const fileUrl = await exportLocalFileToGCS(storage, LOCAL_FLAC_FILE_PATH, fileNameWithFlacExt, DEFAULT_BUCKET, null);
    console.log(`File has been uploaded to:${fileUrl}`);

    // Sends results to output.txt for now
    runTranscription(new speech.SpeechClient(), fileNameWithFlacExt);
}

const convertToFlac = (filePath, fileName) => {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    console.log("Starting file conversion to flac...");
    return new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .audioChannels(2)
            .audioFrequency(48000)
            .toFormat('flac')
            .on('error', (err) => {
                reject(`Error occurred during file encoding ${err}`);
            })
            .on('progress', (progress) => {
                // console.log(JSON.stringify(progress));
                console.log('Processing: ' + progress.targetSize + ' KB converted');
            })
            .on('end', () => {
                resolve('Processing file to FLAC finished !');
            })
            .save(`${FLAC_FILE_OUTPUT_FOLDER}/${fileName}.flac`);
    })

}

const exportLocalFileToGCS = async (storage, localFilePath, fileName, bucketName, options) => {
    options = options || {};

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Create public url for files
    const generatePublicUrl = (bucketName, fileName) => `https://storage.googleapis.com/${bucketName}/${fileName}`;

    console.log(`Uploading file to Google Cloud Storage...`);
    return bucket.upload(localFilePath, options)
        .then(() => file.makePublic())
        .then(() => generatePublicUrl(bucketName, fileName));
}

const runTranscription = async (client, fileName) => {
    const fs = require('fs');

    const gcsUri = `gs://oliver-hack-the-north/${fileName}` // pass in the URI
    const encoding = 'FLAC';
    const languageCode = 'en-US';

    const config = {
        enableWordTimeOffsets: true,
        encoding: encoding,
        sampleRateHertz: 48000,
        languageCode: languageCode,
        audioChannelCount: 2
    };

    /**
    * Note: All audio files longer than one minute must be stored in a Cloud storage bucket to be transcribed by
    * speech-to-text api
    */
    const audio = {
        // content: fs.readFileSync(filename).toString('base64') // for local files
        uri: gcsUri
    };

    const request = {
        config: config,
        audio: audio,
    };


    // Detects speech in the audio file. This creates a recognition job that you
    // can wait for now, or get its result later.

    // Get a Promise representation of the final result of the job
    console.log("Begin transcription of audio file...");
    const [operation] = await client.longRunningRecognize(request);

    // Get a Promise representation of the final result of the job
    const [response] = await operation.promise();
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n'); // base64 string

    const fileNameNoExt = fileName.split(".")[0]
    console.log(`Writing transcript to ${fileNameNoExt}.txt`)
    // console.log(`Response data: ${JSON.stringify(response)}\n`);
    // const timeOffsets = response.resulsts
    //      .map(result => result.alternatives[0].words)
    fs.writeFile(`${AUDIO_TRANSCRIPTS_OUTPUT}/${fileNameNoExt}.txt`, transcription.toString(), 'utf8', (err) => { return err ? console.log(`Error writing file: ${fileNameNoExt}`) : console.log(`successful write to ${fileNameNoExt}.txt`) });
}

// process.on('unhandledRejection', err => {
//     console.error(err.message);
//     process.exitCode = 1;
// });

// transcribeMp3File('6ec6ad4c243447948dfe39b986a76d3d'); // TODO COMMENT OUT IN PROD
exports.transcribeMp3File = transcribeMp3File;