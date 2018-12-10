var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*

    A user may have 0 - n devices. Each user has a unique appId which acts as a foreign key for devices.


    DEVICE SCHEMA:
    
    - appId: Primary key, used to attribute device to its user.
    - deviceId: Identifier used to distinguish devices from each other.
    - name: Name given to device at download page from user.
    - socketId: Unique identifier which represents a device's socket connection to the server.
    - screenshot: base64 encoded screenshot image from device. Old data is thrown away when new images are retrieved.
    - webcam: base64 encoded webcam image from device. Old data is thrown away when new images are retrieved.

*/

var deviceSchema = new Schema({
    appId: { // Multiple devices with same appId == same user
        type: String, 
        unique: false, 
        required: true
    },
    deviceId: {
        type: Number,
        unique: false,
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
    screenshot: {
        data: Buffer,
        contentType: String
    },
    webcam: {
        data: Buffer,
        contentType: String
    }
});

var Device = mongoose.model('Device', deviceSchema);
module.exports = Device;