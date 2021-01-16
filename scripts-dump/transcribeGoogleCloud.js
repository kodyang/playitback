require = require('esm')(module)
// TODO: Transcription from file uploaded in the bucket (remote files: https://cloud.google.com/speech-to-text/docs/sync-recognize#performing_synchronous_speech_recognition_on_a_remote_file)
// TODO: Add dependencies esm, npm install --save @google-cloud/speech (client library)
// TODO: Authentication in prod env: https://cloud.google.com/docs/authentication/production
// TODO: Transcribe incoming files (need to be converted to flac file format? matching sampleRateHertz & audioChannelCount?)
// TODO: Brainstorm storage of input files, and output file transcripts (usage of Cloud buckets?)

function main() {
    // Imports the Google Cloud client library
    const speech = require('@google-cloud/speech');
    const fs = require('fs');
    // const esm = require('esm')(module)
    
    // Creates a client
    const client = new speech.SpeechClient();
    
    async function quickStart() {
        /**
        * TODO(developer): Uncomment the following lines before running the sample.
        */
        const filename = './test-files/test-audio.flac'; // manually converted
        const encoding = 'FLAC';
        const sampleRateHertz = 48000; // hard coded
        const languageCode = 'en-US';
        
        const config = {
            encoding: encoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode,
            audioChannelCount: 2 // don't even know what this is lol but it was hard coded
        };
        
        /**
        * Note that transcription is limited to 60 seconds audio.
        * Use a GCS file for audio longer than 1 minute.
        */
        const audio = {
            content: fs.readFileSync(filename).toString('base64'),
        };
        
        const request = {
            config: config,
            audio: audio,
        };
        
        
        // Detects speech in the audio file. This creates a recognition job that you
        // can wait for now, or get its result later.
        // const [operation] = await client.longRunningRecognize(request);
        
        // Get a Promise representation of the final result of the job
        const [response] = await client.recognize(request);
        const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
        console.log(`Transcription: ${transcription}`);
    }
    quickStart();
}

process.on('unhandledRejection', err => {
    console.error(err.message);
    process.exitCode = 1;
});

main();