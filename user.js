const mongoose = require('mongoose');
const { type } = require('os');
const Schema  = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    skills: {
        type: Array,
        default: 'NaN',
        required: true,
    },
    tempCode: {
        type: String,
        required: false,
    },
    image_id: {
        type: String,
        required: false,
    },
    joinDate: {
        type: String,
        required: true,
    },
    connected: {
        type: Array,
        required: false,
    }, rate: {
        type: Array,
        required: false,
    }
});

module.exports = mongoose.mongoose.model('User', userSchema);