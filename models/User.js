const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
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
    saldo: {
        type: Number,
        default: 0,
    },
    created_at: {
        type: Date,
        default: Date.now,
    }
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

module.exports = User;
