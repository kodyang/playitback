var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');


/* GET users listing. */
router.get('/status', function(req, res, next) {
  res.sendStatus(200);
});

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

//create api
router.get('/searchStatic', (req, res) => {
  async.eachSeries(
    // Pass items to iterate over
    ["storage/beescript.txt", "storage/afewgoodmen.txt"],
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

          cb(err);
        });
    },
    // Final callback after each item has been iterated over.
    function(err) {
      index.search(req.body.searchKey, {
        limit: 10
      }, function(search_results) {
        res.send(search_results);
      });
    }
  );
})

router.get('*', function(req, res, next) {
  res.sendStatus(404);
})

module.exports = router;