const mongoose = require("mongoose");
const { type } = require("os");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    connected: {
        required: false,
        type: Array
    },
    description: {
        required: false,
        type: String
    },
    email: {
        required: true,
        type: String,
        unique: true
    },
    image_id: {
        required: false,
        type: String
    },
    joinDate: {
        required: true,
        type: String
    },
    name: {
        required: true,
        type: String
    },
    password: {
        required: true,
        type: String
    },
    rate: {
        required: false,
        type: Array
    },
    skills: {
        default: "NaN",
        required: true,
        type: Array
    },
    tempCode: {
        required: false,
        type: String
    },
    userId: {
        required: false,
        type: String
    }
});

module.exports = mongoose.mongoose.model("User", userSchema);