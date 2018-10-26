var mongoose = require('mongoose');
//var bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
//const saltRounds = 12;

var deviceSchema = new Schema({
    appId: {
        type: String,
        unique: false, // Multiple devices with same appId == same user
        required: true
    },
    deviceId: {
        type: Number,
        unique: true,
        required: true
    },
    name: {
        type: String,
        unique: false,
        required: true
    },
    socketId: {
        type: String,
        required: false
    },
    connected: {
        type: Boolean,
        required: true
    }
});

//TODO: have appId as its key, as well as fields like webcamPhoto, screenshot, coords, ip

var Device = mongoose.model('Device', deviceSchema);
module.exports = Device;