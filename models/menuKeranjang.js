const mongoose = require('mongoose');

const menuKeranjangSchema = new mongoose.Schema({
    nama_menu: { type: String, required: true },
    deskripsi: { type: String, required: true },
    harga: { type: Number, required: true },
    gambar: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
}, { collection: 'menu' });

const MenuKeranjang = mongoose.model('MenuKeranjang', menuKeranjangSchema);

module.exports = MenuKeranjang;
