const mongoose = require('mongoose');

const TransaksiSchema = new mongoose.Schema({
    id_user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    total_harga: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'sukses'],
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    }
}, { collection: 'transaksi' });

const Transaksi = mongoose.model('Transaksi', TransaksiSchema);

module.exports = Transaksi;
