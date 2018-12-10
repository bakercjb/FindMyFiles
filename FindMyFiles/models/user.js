var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
const saltRounds = 12;

/*
    A user is created when a successful registration process is completed from the index page.

    USER SCHEMA:
    
    - username: Unique primary key identifier for a user in the database.
    - password: Password for the user. Passwords are hashed and salted before entry into the database.
    - appId: Unique identifier for the user which allows tracking for a user's list of devices.
    
*/

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
    appId: {
        type: String,
        unique: true,
        required: false,
        sparse: true
    }
});

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

var User = mongoose.model('User', userSchema);
module.exports = User;