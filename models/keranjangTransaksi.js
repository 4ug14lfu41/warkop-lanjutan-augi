const mongoose = require('mongoose');

const keranjangTransaksiSchema = new mongoose.Schema({
    id_user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserKeranjang', required: true },
    total_harga: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'sukses'], default: 'pending' },
    created_at: { type: Date, default: Date.now }
},  { collection: 'transaksi' });

const KeranjangTransaksi = mongoose.model('KeranjangTransaksi', keranjangTransaksiSchema);

module.exports = KeranjangTransaksi;
