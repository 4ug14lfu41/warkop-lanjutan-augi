const mongoose = require('mongoose');

const userKeranjangSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    saldo: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
}, { collection: 'users' });

const userKeranjang = mongoose.model('userKeranjang', userKeranjangSchema);

module.exports = userKeranjang;
