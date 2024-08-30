const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    nama_menu: String,
    deskripsi: String,
    harga: Number,
    gambar: String,
    created_at: Date
}, { collection: 'menu' }); // Explicitly set the collection name

const Menu = mongoose.model('Menu', menuSchema);

module.exports = Menu;
