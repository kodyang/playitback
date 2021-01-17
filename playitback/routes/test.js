var express = require('express');
var router = express.Router();

var fs = require('fs');

const path = require("path");
const { https } = require('follow-redirects');

var fetch = require('node-fetch');

const { transcribeMp3File } = require('../services/transcribeGoogleCloud');
const { exec } = require("child_process");


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
  router.get('/hello', async (req, res) => {
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
    });
  
      const response = {
        urlsList: audio_urls,
        fileNamesList: file_names,
        title: eps_title
      }

    //   response.fileNamesList.forEach(fileName => {
    //       fs.rename(`./storage/mp3/${fileName}`,
    //       `./storage/mp3/${fileName}.mp3`, (err) => {
    //         if (err) console.log('RENAME ERROR: ' + err);
    //       })
    //   });

      response.fileNamesList.forEach(fileName => {
        // Rename files
        // exec(`mv ./storage/mp3/${fileName}.mp3 ./storage/mp3/a.mp3`, (error, stdout, stderr) => {
        //     if (error) {
        //         console.log(`error: ${error.message}`);
        //         return;
        //     }
        //     if (stderr) {
        //         console.log(`stderr: ${stderr}`);
        //         return;
        //     }
        //     console.log("renamed")
        // });
        // console.log(fileName)
        transcribeMp3File(fileName);
      });

    //   transcribeMp3File('6ec6ad4c243447948dfe39b986a76d3d')
    res.send(response);
  
    //handles errors
    process.on('uncaughtException', function (err) {
      console.log(err);
    });
  });

module.exports = router;
