var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
const saltRounds = 12;

var userSchema = new Schema({
	username: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	password: {
		type: String,
		required: true
	},
    loggedIn: {
        type: Boolean,
        required: true
    },
    appId: {
        type: String,
        unique: true,
        required: false // If user has never installed, generate appId
    },
    socketId: {
        type: String,
        required: false,
        unique: true
    }
});

//TODO: make new file "device.js" and have appId as its key, as well as fields like webcamPhoto, screenshot, coords, ip

// authenticate input against database
userSchema.statics.authenticate = function (username, password, callback) {
	User.findOne({ username: username }).exec(function (err, user) {
		if (err) {
            return callback(err);
		} else if (!user) {
			const err = new Error('User not found.');
			err.status = 401;
			return callback(err);
		}
		bcrypt.compare(password, user.password, function (err, result) {
			if (result === true) {
                // Returns user object
				return callback(null, user);
			} else {
				return callback();
			}
		});
	});
}


// hashing a password before saving it to the database
userSchema.pre('save', function (next) {
	var user = this;
    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) {
                return next(err);
            }
            user.password = hash;
            next();
        }); 
    });
});

var User = mongoose.model('User', userSchema);
module.exports = User;