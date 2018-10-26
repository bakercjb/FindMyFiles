var express = require('express');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var app = express();
var https = require('https');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ss = require('socket.io-stream');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var routes = require('./routes/router');
var User = require('./models/user');
var Device = require('./models/device');

const PORT = 3000;

// connect to MongoDB
mongoose.connect('mongodb://localhost/findMyFiles', { useNewUrlParser: true });
var db = mongoose.connection;

// handle mongo error
db.on('error', console.error.bind(console, 'Database error '));
db.once('open', function () { /* Connected. */ });

var mongoStore = new MongoStore({mongooseConnection: db});
var expressSession = session({
    //key: 'express.sid',
    secret: '5D7F15F2FCE8DDB2DBEF5C38BE896C238BA7E0A432E396759030A853FA6B1151',
	resave: true,
	saveUninitialized: false,
	store: mongoStore
});

// use sessions for tracking logins
app.use(expressSession);

// parse incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// serve static files from /public
app.use(express.static(__dirname + '/frontend'));

app.set('view engine', 'ejs')

// include routes
app.use('/', routes);

// Function to find client by app_id and see if logged in 
function client_authentication(app_id, device_id, socket_id, callback) {
    // TODO take appId from device and compare it to hashed appId in db.
    // TODO update users with connected devices 
    Device.findOne({appId: app_id, deviceId: device_id}).exec(function (error, device) {
        if(error) {
            console.log(error);
            return callback(error, false);
            
        } else {
            if(device == null) {
                const err = new Error('Device not found!');
                console.log(err.message);
                return callback(err, false);
                
            }
            device.socketId = socket_id;
            device.connected = true;
            device.save(function(err) {
                if(err) { return callback(err, false); }
                
                // Device is authenticated
                return callback(false, true);
            });
        }
    });
}

// If appId is correct and user is logged in, accept socket connection
io.on('connection', function(socket) {
    // Create dictionary hosting devices possessed by client, and update their statuses
    // based on connections (offline or online)
    
    socket.auth = false;
    socket.on('authenticate', function(data) {
        //check client tokens       
        client_authentication(data.app_id, data.device_id, socket.id, function(err, success) {
            if(!err && success) {
                console.log("\nAuthenticated socket ", socket.id, '\n');
                socket.auth = true;
            }
        });
    });
    
    setTimeout(function() {
        // If socket did not authenticate, disconnect it 
        if(!socket.auth) {
            console.log("\nDisconnecting socket ", socket.id, '\n');
            socket.disconnect('unauthorized');
        } 
    }, 1000);
    
    socket.on('client_error', function(data) {
        console.log("\n******ERROR SENT FROM CLIENT******")
        Object.getOwnPropertyNames(data).forEach(
        function(val, idx, arr) {
            console.log(val + ' -> ' + data[val]);
        });
        console.log("**********************************\n")
    });
    
    // TODO: Make functional with windows
    socket.emit('take_webcam_picture', '');

    ss(socket).on('send_webcam_picture', function(stream, data) {
        var filename = path.basename(data.name);
        var localPath = __dirname + '/uploads/' + filename;
        console.log(filename);
        console.log(localPath);
        stream.pipe(fs.createWriteStream(localPath));
    });
    
    socket.emit('take_screenshot', '');
    
    ss(socket).on('send_screenshot', function(stream, data) {
        var filename = path.basename(data.name);
        var localPath = __dirname + '/uploads/' + filename;
        console.log(filename);
        console.log(localPath);
        stream.pipe(fs.createWriteStream(localPath));
    });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
// define as the last app.use callback
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
});

// listen on PORT
http.listen(PORT, function () {
    console.log('Express app listening on port 3000');
});