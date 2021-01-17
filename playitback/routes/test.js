var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');
const url = require('url')

const path = require("path");
const { https } = require('follow-redirects');

var fetch = require('node-fetch');

const { transcribeMp3File } = require('../services/transcribeGoogleCloud');


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
  function urlToMp3(url, fileName) {
    let file = fs.createWriteStream(path.join(__dirname, '../storage/mp3/', fileName + '.mp3'));
    https.get(url, function (response) {
      response.pipe(file);
    });
  }
  
  //call listen notes API using getData function
  router.get('/hello', (req, res) => {
    eps_title = req.params.id
    let audio_urls = []
    let file_names = []
    getData(eps_title).then(data => {
      //loops through results and gives back all of the audio urls
      data.results.forEach(function (result) {
        let audioUrl = result.audio;
  
        //title is id of podcast also extension of mp3 file
        file_names.push(result.id); //push podcastid
  
        audio_urls.push(audioUrl);
        urlToMp3(audioUrl, result.id);
  
      });
  
      const response = {
        urlsList: audio_urls,
        fileNamesList: file_names,
        title: eps_title
      }
      // res.json(response)
  
      /*
      response.urlsList.forEach(episode, index => {
        const file_name = response.fileNameList[index];
        console.log('--------');
        console.log(episode, file_name);
        
  
      });
      */
  
      response.fileNamesList.slice(3).forEach(fileName => {
        console.log(fileName);
        transcribeMp3File(fileName);
  
      })
    //   transcribeMp3File('5048de8a5baa4c8fb3c3c7d46ea73561')
      /**
       * FOR TORJA
       * The function "transcribeToMp3" has been imported on line 18, it takes in a string that's the name of the mp3 file (no extension)
       * As long as the file is stored under /storage/mp3 this should work.
       * 
       * So once you have the list of fileNames something like
       * fileNamesList.forEach(fileName => {
       *   transcribeMp3File(fileName);
       * })
       * 
       * And the resulting transcripts should appear in /storage/audioTranscripts
       */
      res.send(response);
    });
  
    //handles errors
    process.on('uncaughtException', function (err) {
      console.log(err);
    });
  });

module.exports = router;
