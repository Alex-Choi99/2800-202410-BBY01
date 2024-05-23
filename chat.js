const mongoose = require('mongoose');
const chatSchema = new mongoose.Schema({
    participants: [{ type: String, required: true }], // Array of user emails
    messages: [{
        sender: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Chat', chatSchema);