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


//var http = require('http').Server(app);
var io = require('socket.io').listen(server);
var ss = require('socket.io-stream');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var routes = require('./routes/router');
var User = require('./models/user');
var Device = require('./models/device');

app.io = io;

//const PORT = 3000;

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
    User.findOne({username: app_id}).exec(function (err, user) {
        if (err) {
            return callback(err);
		} else if (!user) {
			const err = new Error('User not found.');
			err.status = 401;
			return callback(err, false);
		}
		bcrypt.compare(app_id, user.appId, function (err, result) {
			if (result === true) {
                
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
                socket.emit('authorized','');
                
                
            }
        });
    });
                   
    setTimeout(function() {
        // If socket did not authenticate, disconnect it 
        if(!socket.auth) {
            console.log("\nDisconnecting socket ", socket.id, '\n');
            socket.emit('unauthorized', '');
        } 
    }, 1000);
    
    
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

/*
http.listen(PORT, function () {
    console.log('Express app listening on port 3000');
});
*/