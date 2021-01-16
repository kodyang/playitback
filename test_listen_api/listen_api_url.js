var fetch = require('node-fetch'); const { get } = require('request');

var url = 'https://listen-api.listennotes.com/api/v2/search?q=star%20wars&sort_by_date=0&type=episode&offset=0&len_min=10&len_max=30&genre_ids=68%2C82&published_before=1580172454000&published_after=0&only_in=title%2Cdescription&language=English&safe_mode=0';

var key = '0ac87b1a52154a49ab07451d34224f2b';

//change using MDN documentation
async function getData(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-ListenAPI-Key': key
    }
  });
  return response.json();

}
getData(url).then(data => {

  console.log(data);
  console.log(data.results[0].audio)


  //2 loops through results and gives back all of the audio urls
  data.results.forEach(function (result) {
    // find img src
    var audioUrl = result.audio;
    console.log(audioUrl);

  });

});


//3 function that returns audio file 