
function parseHistory() {

  var msPerMonth = 1000*60*60*24*31;
  var oneMonthAgo = (new Date).getTime() - msPerMonth;
  chrome.history.search({
      'text': 'youtube.com/watch',
      'startTime': oneMonthAgo
    }, function(historyItems) {
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        console.log(url);
        console.log(url.slice(32, 43));
      }

      var videoIds = historyItems.map(function(item) {
        return item.url.slice(32, 43);
      })

      var uniqueVideoIds = [...new Set(videoIds)];
      console.log(uniqueVideoIds)
      uniqueVideoIds.forEach(function(id) {
        var url = new URL("https://playitback.azurewebsites.net/api/youtube/subtitles");
        // var url = new URL("http://localhost:8000/api/youtube/subtitles");
        url.searchParams.append("videoId", id);

        console.log("Making request to :", url);
        fetch(url)
        .then(res => res.json())
        .then(data => {
          console.log(data);
        });
      });
  })
}

document.addEventListener('DOMContentLoaded', function () {
  parseHistory();
});