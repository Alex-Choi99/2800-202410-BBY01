const mongoose = require('mongoose');
const chatSchema = new mongoose.Schema({
    participants: [{ type: String, required: true }],
    messages: [{
        sender: { type: String, ref: 'User', required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Chat', chatSchema);