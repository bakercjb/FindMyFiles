var io = require('socket.io-client');
var HOST = '127.0.0.1';
var PORT = 3000;

/* Package these variables in exe */
const TOKEN = '001';
const USER = 'a';
/*********************************/

var socket = io.connect('http://' + HOST + ':' + PORT + '/dashboard',
    {query: {token: TOKEN, user: USER}});

socket.on('connect', function () {
    socket.on('message', function(data) {
        console.log(data);
    });
    
    //emit password and/or appId over TLS to prove its truly the right node
    //server will take note of IP and save it. 
    socket.emit('message', 'hi')
});