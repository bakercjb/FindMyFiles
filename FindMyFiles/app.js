var express = require('express');
var fs = require('fs');
var path = require('path');
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

// include routes
app.use('/', routes);

// Function to find by username and see if logged in 
function client_authentication(username, app_id) {
    User.findOne({username: username, appId: app_id}).exec(function (error, user) {
        if(error) {
            console.log(error);
            return error;
        } else {
            if(user == null) {
                const err = new Error('User not found!');
                err.status = 404;
                console.log(err);
                return err;
            } else if(user.loggedIn == false) {
                const err = new Error('User not logged in!');
                err.status = 401;
                console.log(err);
                return err;
            }
            console.log(user.loggedIn);
            console.log(user.appId);
        }
    });
}

io.use(function(socket, next) {
    var handshakeToken = socket.handshake.query.token;
    var handshakeUser = socket.handshake.query.user;
    
    //if appId token is valid and user is logged in, accept
    console.log("Handshake token: " + handshakeToken);
    console.log("Handshake username: " + handshakeUser);
    
    // If handshakeToken exists in database, check if user is logged in
    return next(client_authentication(handshakeUser, handshakeToken));    
});

// If appId is correct and user is logged in, accept socket connection
var namespace = io.of('/dashboard');
namespace.on('connection', function(socket) {
    console.log('Socket connected.');
    
    socket.emit('message', 'hello');
    
    ss(socket).on('test_pic', function(stream, data) {
        var filename = path.basename(data.name);
        var localPath = __dirname + '/uploads/' + filename;
        console.log(filename);
        console.log(localPath);
        stream.pipe(fs.createWriteStream(localPath));
    });
    
    //socket.emit('take_webcam_picture', '');
    
    socket.on('message', function(data) {
        console.log('Message: ' + data);
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