var express = require('express');
var router = express.Router();
var path = require('path');
var User = require('../models/user');

// GET route for reading data 
router.get('/', function (req, res, next) {
	return res.sendFile(path.join(__dirname + '/../frontend/index.html'));
});

// POST route for updating data 
router.post('/', function (req, res, next) {
	
	if (req.body.username && req.body.password &&
		req.body.passwordConf) {
			
		var userData = {
			username: req.body.username,
			password: req.body.password,
            loggedIn: true,
            appId: "001" // TODO: REMOVE
		}
		
		User.create(userData, function (error, user) {
			if (error) {
				return next(error);
			} else {
				req.session.userId = user._id;
				return res.redirect('/mainMenu');
			}
		});
        
	} else if (req.body.logUser && req.body.logPass) {
		User.authenticate(req.body.logUser, req.body.logPass, function (error, user) {
			if (error || !user) {
				const err = new Error('Wrong username or password.');
				err.status = 401;
				return next(err);
			} else {
				req.session.userId = user._id;
				return res.redirect('/mainMenu');
			}
		});
        
	} else {
		const err = new Error('All fields required.');
		err.status = 400;
		return next(err);
	}
});


// GET route after registering 
router.get('/mainMenu', function (req, res, next) {
	User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {
                return res.sendFile(path.join(__dirname + '/../frontend/mainMenu.html'));
                // TODO: Log user in 
				//return res.send('<h1>Name: </h1>' + user.username + '<h2>Username: </h2>' + user.username + '<br><a type="button" href="/logout">Logout</a>')
			}
		}
	});
});


// GET for logout -- TODO: Update user to be logged out 
router.get('/logout', function (req, res, next) {
	if (req.session) {
		// delete session object
		req.session.destroy(function (err) {
			if (err) {
				return next(err);
			} else {
				return res.redirect('/');
			}
		});
	}
});

module.exports = router;