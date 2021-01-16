var https = require('https'),
URL = require('url'),
fs = require('fs'),
path = require('path');

// usage - 
if (process.argv[2] == null){
console.log("Usage: node dl <downloadurl 1> <downloadurl 2> ... <downloadurl n> ");
console.log("Where the download url is from https://www.myinstants.com/");
process.exit(1);
}
//
// grab the urls
var urls = process.argv.slice(2);

// create our directory if it isn't already there
if ( !fs.existsSync( path.join( __dirname, "myinstants_sounds")))
    fs.mkdirSync( path.join( __dirname, "myinstants_sounds"));

// start our downloads
console.log("---- Downloading ----");
download();

// we use this function to download one at a time so we don't overload the server
function download(){

var url = urls.shift();

if (url == null) {
    console.log("All done.");
    process.exit(0);
}

var parsedUrl = new URL(url);

// URL.parse(url);

var url_options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.path,
    method: "GET"
};

https.request( url_options, res => {

    var data = "";
    res.setEncoding('utf8');
    res.on('data', chunk => data += chunk);
    res.on('end', () => {

        var reg = /onclick="play\(\'\/media\/sounds\/(.+)\'\)/g
        var mp3name = reg.exec(data)[1];

        // reuse our old object, just reset the path
        url_options.path = "/media/sounds/" + mp3name;

        var ws = fs.createWriteStream( path.join( __dirname, "myinstants_sounds", mp3name));
        ws.on('finish', () => {
            console.log(mp3name);
            download();
        });

        https.request( url_options, res => res.pipe( ws )).end();

    });


}).end();
}