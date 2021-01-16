var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({'data': 'you just recieved a response'});
});

module.exports = router;