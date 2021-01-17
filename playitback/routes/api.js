var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');
const he = require('he') // html decoder
const axios = require('axios') // promise based requests
const find = require('lodash').find // utility library
const striptags = require('striptags')
var querystring = require('querystring');
const url = require('url')
var request = require('request'); // "Request" library

const path = require("path");
const { https } = require('follow-redirects');

var fetch = require('node-fetch');

const { transcribeMp3File } = require('../services/transcribeGoogleCloud');

const { exec } = require("child_process");

const { cookie } = require('request');

var indexedData = new FlexSearch(
  {
    doc: {
      id: "indexId",
      field: [
        "id",
        "title",
        "content",
        "url",
        "timestamp",
      ]
    }
  }
);

var isIndexInitialized = false;
router.use(function (req, res, next) {
  if (!isIndexInitialized) {
    // Perform startup commands
    populateIndex();
    isIndexInitialized = true;
  }
  next();
})

/* GET users listing. */
router.get('/status', function (req, res, next) {
  // Testing ability to use environment variables
  res.status(200).send("Test");
});

//create api
router.get('/searchStatic', (req, res) => {
  var fileList = ["storage/beescript.txt", "storage/afewgoodmen.txt"];
  if (!('searchKey' in req.query)) {
    res.status(400).send('Request must contain searchKey field in JSON body!');
    return;
  }
  var index = new FlexSearch(
    {
      doc: {
        id: "id",
        field: [
          "title",
          "content",
          "url",
          "timestamp",
        ]
      }
    }
  );

  async.eachSeries(
    // Pass items to iterate over
    fileList,
    // Pass iterator function that is called for each item
    function (filename, cb) {
      // async
      console.time("import " + filename);
      fs.readFile(filename, 'utf8', function (err, data) {
        if (err) throw err;

        var sentences = data.split(".");
        for (var i = 0; i < sentences.length; ++i) {
          index.add({
            id: filename + i,
            title: filename,
            url: null,
            timestamp: null,
            content: sentences[i].replace(/\s+/g, ' ')
          });
        }

        console.timeEnd("import " + filename);
        cb(err);
      });
    },
    // Final callback after each item has been iterated over.
    function (err) {
      console.time(`search for ${req.body.searchKey}`)
      index.search(req.body.searchKey, {
        limit: 10
      }, function (search_results) {

        console.timeEnd(`search for ${req.query.searchKey}`)

        res.send(search_results);
      });
    }
  );
})

router.get('/youtube/subtitles', async (req, res) => {
  console.log(req.query);

  if (!('videoId' in req.query)) {
    res.status(400).send('Request must contain videoId field in JSON body!');
    return res.end();
  }

  let data = await getSubtitles(req.query.videoId);
  res.json({ "subtitles": data });
})

async function getSubtitles(
  videoId,
) {

  const path = 'storage/youtube/' + videoId + '.txt';
  if (fs.existsSync(path)) {
    console.log("File already cached: ", path);
    const data = fs.readFileSync(path, 'utf8');
    return JSON.parse(data);
  }

  const { data } = await axios.get(
    `https://youtube.com/get_video_info?video_id=${videoId}`
  );
  const langs = [
    'en-US',
    'en',
    'en-GB'
  ]

  const decodedData = decodeURIComponent(data);

  // * ensure we have access to captions data
  if (!decodedData.includes('captionTracks'))
    throw new Error(`Could not find captions for video: ${videoId}`);

  const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
  const [match] = regex.exec(decodedData);
  const { captionTracks } = JSON.parse(`${match}}`);

  const titleRegex = /("title":{.*},"description":)/;
  const [titlematch] = titleRegex.exec(decodedData);
  let { title } = JSON.parse(`{${titlematch}{}}`);
  title = title.simpleText.replace(/\+/g, " ");

  let subtitle;
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    subtitle =
      find(captionTracks, {
        vssId: `.${lang}`,
      }) ||
      find(captionTracks, {
        vssId: `a.${lang}`,
      }) ||
      find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));
    if (subtitle && subtitle.baseUrl) {
      break;
    }
  }
  // * ensure we have found the correct subtitle lang
  if (!subtitle || (subtitle && !subtitle.baseUrl)) {
    console.log(captionTracks)
    throw new Error(`Could not find captions for ${videoId}`);
  }

  const { data: transcript } = await axios.get(subtitle.baseUrl);

  const lines = transcript
    .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
    .replace('</transcript>', '')
    .split('</text>')
    .filter(line => line && line.trim())
    .map(line => {
      const startRegex = /start="([\d.]+)"/;
      const durRegex = /dur="([\d.]+)"/;

      const [, start] = startRegex.exec(line);
      const [, dur] = durRegex.exec(line);

      const htmlText = line
        .replace(/<text.+>/, '')
        .replace(/&amp;/gi, '&')
        .replace(/<\/?[^>]+(>|$)/g, '');

      const decodedText = he.decode(htmlText);
      const text = striptags(decodedText);
      return {
        start,
        dur,
        text,
        title
      };
    });

  fs.writeFile(path, JSON.stringify(lines), function (err) {
    if (err) throw err;
    console.log('Saved to ', path);
  })

  indexYoutube(lines, videoId);

  return lines;
}

function indexYoutube(lines, videoId) {
  for (var i = 0; i < lines.length; ++i) {
    indexedData.add({ // EXAMPLE
      indexId: videoId + i,
      id: videoId,
      title: lines[i].title,
      url: "https://youtu.be/" + videoId + "?t=" + parseInt(lines[i].start).toString(),
      timestamp: parseInt(lines[i].start).toString(),
      content: lines[i].text.replace(/\s+/g, ' ')
    });
  }
}

// Populates the shared index with all available files in filesystem.
// This should be called every app startup
function populateIndex() {

  files = fs.readdirSync('storage/youtube');
  files.forEach(function (fileName, index) {
    const data = fs.readFileSync('storage/youtube/' + fileName, 'utf8');
    const lines = JSON.parse(data);
    indexYoutube(lines, fileName.split('.').slice(0, -1).join('.'));
  })

  podcastFiles = fs.readdirSync('storage/audioTranscripts');
  podcastFiles.forEach(function (fileName, index) {
    // console.log("Adding filename: ", fileName);
    const data = fs.readFileSync('storage/audioTranscripts/' + fileName, 'utf8');
    const timestamps = JSON.parse(data);
    indexPodcast(timestamps, fileName.split('.')[0]);
  })
}

router.get('/search/all', function (req, res, next) {
  if (!("searchKey" in req.query)) {
    res.status(400).send("Must include searchKey in header");
    return res.end();
  }
  const searchResults = searchIndex(req.query.searchKey, req.query.limit);
  // console.log("Search Results: ", searchResults);
  res.json({
    "results": searchResults
  });
})

router.post('/youtube/subtitles/bulk', async function (req, res, next) {

  let resp = [];
  for (entry of req.body) {
    let vid = new URL(entry.titleUrl).searchParams.get("v");
    try {
      let data = await getSubtitles(vid);
      resp.push(data);
    } catch (e) { }
  }
  res.json(resp);
});

function searchIndex(searchKey, limit = 10) {
  let results = indexedData.search(searchKey, {
    field: "content",
    limit: limit
  }, function (search_results) {
    return search_results;
  });
  return results;
}

const redirect_uri = "https://playitback.z9.web.core.windows.net";
const client_id = "6a1c30408e274a138db63e15873fd540";
const client_secret = "56b3b0cef0f545d1b5dd20a65958f607";
const scope = "user-read-private user-read-email user-read-recently-played";
var stateKey = 'spotify_auth_state';
var cookie_to_tokens = {};

// DEPRECATED
router.get('/spotify/login', (req, res) => {
  var state = generateRandomString(16);

  res.cookie(stateKey, state);

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

router.get('/spotify/callback', (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;
  // var storedState = req.cookies ? req.cookies[stateKey] : null;
  console.log('KALVIN' + storedState);
  console.log("ALMOST THERE THE CODE IS" + code);
  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    // res.clearCookie(stateKey);

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: "http://localhost:8000/api/spotify/callback",
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        cookie_to_tokens[storedState] = body.access_token;

        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me/player/recently-played',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          for (item of body.items) {
            console.log("Name: " + item.track.name)
            for (artist of item.track.artists) {
              console.log("Artist: " + artist.name)
            }
            console.log("Played at: " + item.played_at)
            console.log("\n");
          }
        });

        // we can also pass the token to the browser to make requests from there
        // res.redirect('http://localhost:3000' 
        // +
            // querystring.stringify({
              // access_token: access_token,
              // refresh_token: refresh_token
          // })
        // );
        res.sendStatus(200);
      } else {
        res.status(400).send('FAILED THE TOKEN WAS INVALID')
        // res.redirect('/#' +
        //   querystring.stringify({
        //     error: 'invalid_token'
        //   }));
      }
    });
  }
});

router.get('/spotify/username', (req, res) => {
  // var storedState = req.cookies ? req.cookies['access_token'] : null;
  // console.log('KALVIN' + storedState);
  // if (storedState === null || !cookie_to_tokens.has(storedState)) {
  //   res.status(403).send("Invalid session");
  //   return;
  // }
  

  // var access_token = cookie_to_tokens[storedState];
  // console.log(storedState);
  console.log('why is nothing printing ' + req)
  ;
  var access_token = req.query.spotify_auth_state || null;
  if (access_token == null) {
    res.sendStatus(305);
    return;
  }

  console.log("LOOK LIKE" + access_token)
  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(options, function (error, response, body) {
    console.log(body);
    res.json({ "email": body.email });
  });
});

var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

//DOWNLOADING MP3 FILES API
//function that can make request
async function getData(eps_title) {
  let url = 'https://listen-api.listennotes.com/api/v2/search?q=%22' + eps_title.split(' ').join('%20') + '%22&sort_by_date=0&type=episode&offset=0&len_min=0&len_max=150&published_after=0&only_in=title&language=English&safe_mode=0';
  console.log(url);
  let key = '0ac87b1a52154a49ab07451d34224f2b';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-ListenAPI-Key': key
    }
  }).catch(error => console.log(error));
  return response.json();

}

// function that returns audio file 
function urlToMp3(url, fileName) {
  let file = fs.createWriteStream(path.join(__dirname, '../storage/mp3/', fileName + '.mp3'));
  https.get(url, function (response) {
    response.pipe(file);
  });
}

const triggerTranscribe = async (titleHash) => {

  await fs.readdir('./storage/mp3', (err, files) => {
    files.forEach(file => {
      let newName = file.substring(0, Math.min(file.length, 5));
      exec(`mv ./storage/mp3/${file} ./storage/mp3/${newName}.mp3`, (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log("renamed");
      });

      const episodeTitle = titleHash.newName;

      transcribeMp3File(newName, episodeTitle)
        .then(timestamps => {
          indexPodcast(timestamps, newName)
        });
    });
  });
}

//call listen notes API using getData function
router.get('/getAudioUrls/:id', (req, res) => {
  eps_title = req.params.id
  let audio_urls = []
  let file_names = []
  let titles = []
  let ids = []
  let titleMatchId = {}
  getData(eps_title).then(data => {
    //loops through results and gives back all of the audio urls
    data.results.forEach(function (result) {
      let audioUrl = result.audio;

      //title is id of podcast also extension of mp3 file
      file_names.push(result.id); //push podcastid

      audio_urls.push(audioUrl);
      titles.push(result.title_original);
      ids.push(result.id);
      titleMatchId[result.id.substring(0, Math.min(result.id.length, 5))] = result.title_original
      urlToMp3(audioUrl, result.id);

    });

    const response = {
      titleList: titles,
      urlsList: audio_urls,
      fileNamesList: file_names,
      idList: ids
    }

    triggerTranscribe(titleMatchId);

    res.send(response);
  });

  //handles errors
  process.on('uncaughtException', function (err) {
    console.log(err);
  });
});

function indexPodcast(timestamps, fileName) { // TITLES DO NOT MATCH UP BTW
  // console.log(timestamps);
  for (var i = 0; i < timestamps.length; i++) {
    indexedData.add({
      indexId: fileName + i,
      id: fileName,
      title: null,
      url: null,
      timestamp: timestamps[i].startTime, // must be an int
      content: timestamps[i].chunk
    });
  }
}

router.get('*', function (req, res, next) {
  res.sendStatus(404);
})

module.exports = router;
