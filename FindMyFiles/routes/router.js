var express = require('express');
var router = express.Router();
var path = require('path');
var User = require('../models/user');
var Device = require('../models/device');
var bcrypt = require('bcrypt');
const saltRounds = 12;


// GET route for reading data 
router.get('/', function (req, res, next) {
	return res.render(path.join(__dirname + '/../frontend/index'));
});

// POST route for updating data 
router.post('/', function (req, res, next) {
	
	if (req.body.username && req.body.password &&
		req.body.passwordConf) {
			
		var userData = {
			username: req.body.username,
			password: req.body.password,
            appId: "001" // TODO: REMOVE
		}
		
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(userData.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                userData.password = hash;
                User.create(userData, function (error, user) {
                    if (error) {
                        return next(error);
                    } else {
                        
                        /* REMOVE */
                        var deviceData = {
                            appId: "001",
                            deviceId: 1,
                            name: "Chris's laptop",
                            connected: false
                        }
                        
                        Device.create(deviceData, function(error, device) {
                            if(error) {return next(error);}
                            req.session.userId = user._id;
                            return res.redirect('/mainMenu');
                        });
                        /* REMOVE */
                    }
                });
            }); 
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


// GET route after registering or logging in
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
                Device.find({appId: user.appId}).exec(function(err,device_results) {
                    if(err) { return next(err); }
                    return res.render(path.join(__dirname + '/../frontend/mainMenu'), {
                        devices: device_results,
                        user: user
                    });
                });
			}
		}
	});
});


// GET for logout 
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