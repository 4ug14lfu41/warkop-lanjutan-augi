const mongoose = require('mongoose');

const keranjangSchema = new mongoose.Schema({
    id_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    id_menu: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
    jumlah: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
}, { collection: 'keranjang' });

const Keranjang = mongoose.model('Keranjang', keranjangSchema);

module.exports = Keranjang;
