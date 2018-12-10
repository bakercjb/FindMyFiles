var express = require('express');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var bcrypt = require('bcrypt');
var app = express();
var https = require('https');
var server = https.createServer({
    key: fs.readFileSync('keys/key.pem'),
    cert: fs.readFileSync('keys/cert.pem'),
    requestCert: false,
    rejectUnauthorized: false
}, app);

var io = require('socket.io').listen(server);
var ss = require('socket.io-stream');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var routes = require('./routes/router');
var User = require('./models/user');
var Device = require('./models/device');

//expose socket.io operations to ./routes/router.js
app.io = io;

// connect to MongoDB
mongoose.connect('mongodb://localhost/findMyFiles', { useNewUrlParser: true });
var db = mongoose.connection;

// handle mongo error
db.on('error', console.error.bind(console, 'Database error '));
db.once('open', function () { /* Connected. */ });

var mongoStore = new MongoStore({mongooseConnection: db});

// Session generator
var expressSession = session({
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

/* Function to find authenticate device
   Params:
    app_id: appId sent from device
    device_id: deviceId sent from device
    socket_id: socketId sent from device
    callback: Function which dictates whether or not the device was authenticated.
    
   Returns: Successful callback or failure callback
*/
function client_authentication(app_id, device_id, socket_id, callback) {
    // Find a user with the supported appId from device
    User.findOne({username: app_id}).exec(function (err, user) {
        if (err) {
            return callback(err);
		} else if (!user) {
			const err = new Error('User not found.');
			err.status = 401;
			return callback(err, false);
		}
        // Compare unencrypted appId from device with encrypted appId belonging to user
		bcrypt.compare(app_id, user.appId, function (err, result) {
			if (result === true) {
                // Find a device with supported appId and deviceId
                Device.findOne({appId: user.appId, deviceId: device_id}).exec(function (error, device) {
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
                        device.save(function(err) {
                            if(err) { return callback(err, false); }
                            
                            // Device is authenticated
                            return callback(false, true);
                        });
                    }
                });
			} else {
				return callback(err, false);
			}
		});
    });
}

// Incoming connection from device detected
io.on('connection', function(socket) {
    socket.auth = false;
    socket.on('authenticate', function(data) {
        //check client device parameters       
        client_authentication(data.app_id, data.device_id, socket.id, function(err, success) {
            if(!err && success) {
                console.log("\nAuthenticated socket ", socket.id, '\n');
                socket.auth = true;
                // Tell device it has been authenticated
                socket.emit('authorized','');
            }
        });
    });
    
    // Give device 3 seconds to authenticate
    setTimeout(function() {
        // If socket did not authenticate, disconnect it 
        if(!socket.auth) {
            console.log("\nDisconnecting socket ", socket.id, '\n');
            socket.emit('unauthorized', '');
        } 
    }, 3000);
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
server.listen(8080, function() {
    console.log('Express app listening on port 8080');
});