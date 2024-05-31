const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
    messages: [{
        message: { required: true, type: String },
        sender: { ref: "User", required: true, type: String },
        timestamp: { default: Date.now, type: Date }
    }],
    participants: [{ required: true, type: String }]
});

module.exports = mongoose.model("Chat", chatSchema);