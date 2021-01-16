const path = require("path");
const fs = require('fs');
const { https } = require('follow-redirects');

var fetch = require('node-fetch');

var eps_title = 'ball'

var key = '0ac87b1a52154a49ab07451d34224f2b';

//function that can make request
async function getData(eps_title) {
  let url = 'https://listen-api.listennotes.com/api/v2/search?q=' + eps_title + '&sort_by_date=0&type=episode&offset=0&len_min=0&len_max=10&genre_ids=68%2C82&published_before=1580172454000&published_after=0&only_in=title%2Cdescription&language=English&safe_mode=0'

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
getData(eps_title).then(data => {

  //  console.log('count: ' + data.count);

  //2 loops through results and gives back all of the audio urls
  data.results.forEach(function (result) {
    let audioUrl = result.audio;

    //title is id of podcast also extension of mp3 file
    let title = result.id;
    //let title = result.title_original;

    // console.log(audioUrl);
    console.log(title);
    urlToMp3(audioUrl, title);

  });

});

//handles errors
process.on('uncaughtException', function (err) {
  console.log(err);
});



