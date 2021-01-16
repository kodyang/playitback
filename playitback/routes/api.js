var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');
const he = require('he') // html decoder
const axios = require('axios') // promise based requests
const find = require('lodash').find // utility library
const striptags = require('striptags')

/* GET users listing. */
router.get('/status', function(req, res, next) {
  res.sendStatus(200);
});

var fileList = ["storage/beescript.txt", "storage/afewgoodmen.txt"];

// test api
router.get('/test', (req, res, next) => {
  console.log(process.env.Test);
  res.sendStatus(200);
});

//create api
router.get('/searchStatic', (req, res) => {

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
          "content"
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

  const path = 'storage/' + videoId + '.txt';
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
  return lines;
}

router.get('*', function(req, res, next) {
  res.sendStatus(404);
})

module.exports = router;