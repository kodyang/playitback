var express = require('express');
var router = express.Router();

var FlexSearch = require("flexsearch");
var async = require('async')
var fs = require('fs');


/* GET users listing. */
router.get('/status', function(req, res, next) {
  res.sendStatus(200);
});

var fileList = ["storage/beescript.txt", "storage/afewgoodmen.txt"];

//create api
router.get('/searchStatic', (req, res) => {
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

router.get('*', function(req, res, next) {
  res.sendStatus(404);
})

module.exports = router;