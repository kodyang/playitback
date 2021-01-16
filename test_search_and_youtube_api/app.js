//Require module
const express = require('express');
var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');
// Express Initialize
const app = express();

const port = 8000;
var index = new FlexSearch(
// {
//   encode: "icase",
//   tokenize: "strict",
//   threshold: 8,
//   resolution: 9,
//   depth: 1,
//   async: false,
//   cache: false,
//   worker: false
// }
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

app.listen(port, () => {
  console.log('listen port 8000');
})

//create api
app.get('/hello_world', (req, res) => {


  async.eachSeries(
    // Pass items to iterate over
    ["beescript.txt", "afewgoodmen.txt"],
    // Pass iterator function that is called for each item
    function(filename, cb) {
        // async
        fs.readFile(filename, 'utf8', function(err, data) {
          if (err) throw err;
          console.log('OK: ' + filename);
          // console.log(data);
          
          var sentences = data.split(".");
          for (var i = 0; i < sentences.length; ++i) {
            index.add({
              id: filename + i,
              title: filename,
              content: sentences[i].replace(/\s+/g, ' ')
            });
          }


          

          // for (var i = 0; i < data.length; ++i) {
          //   index.add(i, data[i]);
          // }

          cb(err);
        });
    },
    // Final callback after each item has been iterated over.
    function(err) {
      index.search("truth", {
        limit: 5
      }, function(search_results) {
        // res.send(search_results);    
      });
    }
  );

  getSubtitles({videoID: "WLu7e8RZoYc"}).then(function(lines) {
    res.send(lines);
  });
})

/* @flow */
const he = require('he') // html decoder
const axios = require('axios') // promise based requests
const find = require('lodash').find // utility library
const striptags = require('striptags')

async function getSubtitles({
  videoID,
  lang = 'en-US',
}) {
  const { data } = await axios.get(
    `https://youtube.com/get_video_info?video_id=${videoID}`
  );

  const decodedData = decodeURIComponent(data);

  // * ensure we have access to captions data
  if (!decodedData.includes('captionTracks'))
    throw new Error(`Could not find captions for video: ${videoID}`);

  const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
  const [match] = regex.exec(decodedData);
  const { captionTracks } = JSON.parse(`${match}}`);

  console.log(captionTracks)

  const subtitle =
    find(captionTracks, {
      vssId: `.${lang}`,
    }) ||
    find(captionTracks, {
      vssId: `a.${lang}`,
    }) ||
    find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));

  // * ensure we have found the correct subtitle lang
  if (!subtitle || (subtitle && !subtitle.baseUrl)) {
    throw new Error(`Could not find ${lang} captions for ${videoID}`);
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

      console.log(text);

      return {
        start,
        dur,
        text,
      };
    });

  return lines;
}