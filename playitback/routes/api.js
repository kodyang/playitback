var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');
const he = require('he') // html decoder
const axios = require('axios') // promise based requests
const find = require('lodash').find // utility library
const striptags = require('striptags')
const url = require('url')

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
router.use(function(req, res, next) {
  if (!isIndexInitialized) {
    // Perform startup commands
    populateIndex();
    isIndexInitialized = true;
  }
  next();
})

/* GET users listing. */
router.get('/status', function(req, res, next) {
  // Testing ability to use environment variables
  res.status(200).send(process.env.Test);
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
    function(filename, cb) {
        // async
        console.time("import " + filename);
        fs.readFile(filename, 'utf8', function(err, data) {
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
    function(err) {
      console.time(`search for ${req.body.searchKey}`)
      index.search(req.body.searchKey, {
        limit: 10
      }, function(search_results) {

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
  res.json({"subtitles": data});
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

  let subtitle;
  for (let i=0; i<langs.length; i++) {
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

  fs.readdir('storage/youtube', function(err, files) {
    if (err) {
      console.error("Could not read directory: ", err);
      return;
    }

    files.forEach(function(fileName, index) {
      const data = fs.readFileSync('storage/youtube/' + fileName, 'utf8');
      const lines = JSON.parse(data);
      indexYoutube(lines, fileName.split('.').slice(0, -1).join('.'));
    })
  })
}

router.get('/search/all', function(req, res, next) {
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

router.post('/youtube/subtitles/bulk', async function(req, res, next) {

  let resp = [];
  for (entry of req.body) {
    let vid = new URL(entry.titleUrl).searchParams.get("v");
    try {
      let data = await getSubtitles(vid);
      resp.push(data);
    } catch (e) {}
  }
  res.json(resp);
});

function searchIndex(searchKey, limit=10) {
  let results = indexedData.search(searchKey, {
    limit: limit
  }, function(search_results) {
    return search_results;
  });
  return results;
}

router.get('*', function(req, res, next) {
  res.sendStatus(404);
})

module.exports = router;