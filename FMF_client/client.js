var io = require('socket.io-client');
var nodeWebcam = require('node-webcam');
var HOST = '127.0.0.1';
var PORT = 3000;

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
const TOKEN = '001';
const USER = 'a';
/*********************************/

var socket = io.connect('http://' + HOST + ':' + PORT + '/dashboard',
    {query: {token: TOKEN, user: USER}});

socket.on('connect', function () {
    socket.on('take_webcam_picture', function(data) {
        // Create webcam instance 
        var webcam = nodeWebcam.create(opts);

        webcam.capture('.pic', function(error, data) {console.log(data);});

        //var fileReader = new FileReader(), slice = File.slice(0, 100000);
        
        
        
        webcam.clear();

    });
    
    //emit password and/or appId over TLS to prove its truly the right node
    //server will take note of IP and save it. 
    socket.emit('message', 'hi')
});