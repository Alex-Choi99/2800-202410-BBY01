const mongoose = require('mongoose');
const { type } = require('os');
const Schema  = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
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
        required: true,
    },
    tempCode: {
        type: String,
        required: false,
    }
});

module.exports = mongoose.mongoose.model('User', userSchema);