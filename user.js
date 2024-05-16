const mongoose = require('mongoose');
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
        default: ['default']
    },
    image_id: {
        type: String,
        required: false,
    } 
});

module.exports = mongoose.mongoose.model('User', userSchema);