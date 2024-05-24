const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientEmail: { type: String, required: true },
    senderEmail: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
