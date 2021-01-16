var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');
const he = require('he') // html decoder
const axios = require('axios') // promise based requests
const find = require('lodash').find // utility library
const striptags = require('striptags')

const path = require("path");
const { https } = require('follow-redirects');

var fetch = require('node-fetch');


var indexedData = new FlexSearch(
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
<<<<<<< HEAD
router.get('/status', function (req, res, next) {
  res.sendStatus(200);
=======
router.get('/status', function(req, res, next) {
  // Testing ability to use environment variables
  res.status(200).send(process.env.Test);
>>>>>>> d06b244527e39a228cc09ff18805a5e1cd87d912
});

//create api
router.get('/searchStatic', (req, res) => {
  var fileList = ["storage/beescript.txt", "storage/afewgoodmen.txt"];
  if (!('searchKey' in req.body)) {
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

        console.timeEnd(`search for ${req.body.searchKey}`)

        res.send(search_results);
      });
    }
  );
})

router.get('/youtube/subtitles', async (req, res) => {
  console.log(req.body);

  if (!('videoId' in req.body)) {
    res.status(400).send('Request must contain videoId field in JSON body!');
    return res.end();
  }

  let data = await getSubtitles(req.body.videoId);
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
    'en'
  ]

  const decodedData = decodeURIComponent(data);

  // * ensure we have access to captions data
  if (!decodedData.includes('captionTracks'))
    throw new Error(`Could not find captions for video: ${videoId}`);

  const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
  const [match] = regex.exec(decodedData);
  const { captionTracks } = JSON.parse(`${match}}`);

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
    throw new Error(`Could not find ${lang} captions for ${videoId}`);
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
    indexedData.add({
      id: videoId + i,
      title: videoId,
      url: "https://youtu.be/" + videoId + "?t=" + parseInt(lines[i].start).toString(),
      timestamp: parseInt(lines[i].start).toString(),
      content: lines[i].text.replace(/\s+/g, ' ')
    });
  }
}

// Populates the shared index with all available files in filesystem.
// This should be called every app startup
function populateIndex() {

  fs.readdir('storage/youtube', function (err, files) {
    if (err) {
      console.error("Could not read directory: ", err);
      return;
    }

    files.forEach(function (fileName, index) {
      const data = fs.readFileSync('storage/youtube/' + fileName, 'utf8');
      const lines = JSON.parse(data);
      indexYoutube(lines, fileName.split('.').slice(0, -1).join('.'));
    })
  })
}

router.get('/search/all', function (req, res, next) {
  if (!("searchKey" in req.body)) {
    res.status(400).send("Must include searchKey in header");
    return res.end();
  }
  const searchResults = searchIndex(req.body.searchKey, req.body.limit);
  console.log("Search Results: ", searchResults);
  res.json({
    "hello": "world",
    "results": searchResults
  });
})

function searchIndex(searchKey, limit = 10) {
  let results = indexedData.search(searchKey, {
    limit: limit
  }, function (search_results) {
    return search_results;
  });
  return results;
}

router.get('*', function (req, res, next) {
  res.sendStatus(404);
})

module.exports = router;



//DOWNLOADING MP3 FILES API

//var eps_title = 'ball'

  //eps_title = req.body.title
  //function that can make request
  async function getData(eps_title) {
    let url = 'https://listen-api.listennotes.com/api/v2/search?q=' + eps_title + '&sort_by_date=0&type=episode&offset=0&len_min=0&len_max=5&genre_ids=68%2C82&published_before=1580172454000&published_after=0&only_in=title%2Cdescription&language=English&safe_mode=0'

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
  function urlToMp3(url, title) {
    let file = fs.createWriteStream(path.join(__dirname, './downloads', title + '.flac'));
    https.get(url, function (response) {
      response.pipe(file);
    });
  }

  //call listen notes API using getData function
router.get('/getAudioUrls/:id', (req, res) => {
  eps_title = req.params.id
  let audio_urls = []
  getData(eps_title).then(data => {

    //  console.log('count: ' + data.count);

    //2 loops through results and gives back all of the audio urls
    data.results.forEach(function (result) {
      let audioUrl = result.audio;

      //title is id of podcast also extension of mp3 file
//      let title = result.id;
      //let title = result.title_original;

      //console.log(audioUrl);
      audio_urls.push(audioUrl)
      //console.log(title);
      //urlToMp3(audioUrl, title);

    });
    const response = {
      urlsList: audio_urls,
      title: eps_title
    }
    // res.json(response)

    res.send(audio_urls);

  });

  //handles errors
  process.on('uncaughtException', function (err) {
    console.log(err);
  });
});


