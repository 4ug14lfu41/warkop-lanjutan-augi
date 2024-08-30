const express = require('express');
const path = require('path');
const session = require('express-session');
const Menu = require('./models/Menu');
const User = require('./models/User');
const Transaksi = require('./models/Transaksi'); 
const Keranjang = require('./models/Keranjang');


require('./config/db'); // Ensure this connects to MongoDB properly

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check login status
app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session.isLoggedIn || false;
    res.locals.user = req.session.user || null;
    next();
});

app.get('/', async (req, res) => {
    try {
        const menus = await Menu.find(); // Fetch all menus
        let saldo = 0;

        if (req.session.user) {
            const user = await User.findById(req.session.userId);
            saldo = user ? user.saldo : 0;
        }

        res.render('index', { 
            menus: menus,
            saldo: saldo // Send saldo to view
        });
    } catch (err) {
        console.error('Error retrieving data:', err.message);
        res.status(500).send('Error retrieving data');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });
        
        if (!user) {
            return res.status(401).send('Email or password is incorrect');
        }
        req.session.isLoggedIn = true;
        req.session.user = user;
        req.session.userId = user._id;
        res.redirect('/');
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).send('Error during login');
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email is already in use');
        }

        const newUser = new User({
            username,
            email,
            password,
            saldo: 0, // Set default saldo
            created_at: new Date() // Set created_at
        });

        await newUser.save();
        res.redirect('/login'); // Redirect to login page after successful registration
    } catch (err) {
        console.error('Error during registration:', err.message);
        res.status(500).send('Error during registration');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error during logout');
        }
        res.redirect('/');
    });
});

app.post('/add-to-cart', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ message: 'Please login first' });
    }

    const { id_menu, jumlah } = req.body;
    const id_user = req.session.userId;

    try {
        const newItem = new Keranjang({
            id_user,
            id_menu,
            jumlah
        });

        await newItem.save();
        res.json({ message: 'Item added to cart' });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ message: 'Error adding to cart' });
    }
});

app.post('/buy', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ message: 'Please login first' });
    }

    const { id_menu, jumlah } = req.body;
    const id_user = req.session.user.id;

    try {

        const menuPrice = 10000; 

        const totalPrice = menuPrice * jumlah;

        // Check user balance
        const user = await User.findById(id_user);
        if (user.saldo < totalPrice) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Create transaction
        const transaksi = new Transaksi({
            id_user,
            total_harga: totalPrice,
            status: 'pending'
        });

        await transaksi.save();

        // Create cart item
        const newItem = new Keranjang({
            id_user,
            id_menu,
            jumlah
        });

        await newItem.save();

        // Update user balance
        user.saldo -= totalPrice;
        await user.save();

        res.json({ message: `Transaction successful. Total: ${totalPrice}` });
    } catch (err) {
        console.error('Error during purchase:', err);
        res.status(500).json({ message: 'Error during purchase' });
    }
});

app.get('/add-balance', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;

    try {
        const user = await User.findById(userId).exec();
        const saldo = user ? user.saldo : 0;
        res.render('add_balance', { errorMessage: null, successMessage: null, saldo: saldo });
    } catch (err) {
        console.error('Error fetching balance:', err);
        res.status(500).send('Error fetching balance');
    }
});

app.post('/add-balance', async (req, res) => {
    const userId = req.session.userId; 
    let { amount } = req.body;

    if (!userId) {
        return res.redirect('/login');
    }

    amount = Number(amount); // Konversi amount ke Number

    if (isNaN(amount) || amount <= 0) {
        // Render page with error message if amount is invalid
        return res.render('add_balance', { errorMessage: 'Jumlah saldo harus lebih dari 0', successMessage: null, saldo: 0 });
    }

    try {
        // Find user and update saldo
        const user = await User.findById(userId).exec();
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Update the saldo
        user.saldo += amount;
        await user.save();

        // Render page with success message and updated saldo
        res.render('add_balance', { errorMessage: null, successMessage: 'Saldo berhasil ditambahkan!', saldo: user.saldo });
    } catch (err) {
        console.error('Error updating balance:', err);
        res.status(500).send('Error updating balance');
    }
});

app.get('/keranjang', async (req, res) => {
    const userId = req.session.userId;

    try {
        // Ambil item keranjang berdasarkan user
        const items = await Keranjang.find({ id_user: userId }).populate('id_menu');

        // Hitung total harga
        const totalHarga = items.reduce((total, item) => {
            return total + item.id_menu.harga * item.jumlah;
        }, 0);

        // Ambil saldo user
        const user = await User.findById(userId);

        // Render view dengan data yang diperlukan
        res.render('keranjang', { items, totalHarga, user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});
  
  
app.post('/keranjang/hapus', async (req, res) => {
    const { id_keranjang } = req.body;

    try {
        // Menghapus item dari keranjang berdasarkan id
        await Keranjang.findByIdAndDelete(id_keranjang);

        // Redirect kembali ke halaman keranjang setelah item dihapus
        res.redirect('/keranjang');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting item from cart');
    }
});
  
  // Endpoint POST /keranjang/bayar
  app.post('/keranjang/bayar', async (req, res) => {
    const userId = req.session.userId;
    const totalHarga = parseFloat(req.body.total_harga);
  
    if (!userId || isNaN(totalHarga)) {
        return res.status(400).send('Invalid request');
    }
  
    try {
        const user = await User.findById(userId).exec();
        if (!user) {
            return res.status(404).send('User not found');
        }
  
        if (user.saldo < totalHarga) {
            return res.status(400).send('Insufficient balance');
        }
  
        // Perbarui saldo user
        user.saldo -= totalHarga;
        await user.save();
  
        // Simpan transaksi
        await new Transaksi({
            id_user: userId,
            total_harga: totalHarga,
            status: 'sukses'
        }).save();
  
        // Hapus keranjang setelah pembayaran
        await Keranjang.deleteMany({ id_user: userId }).exec();
  
        // Redirect atau render halaman konfirmasi
        res.redirect('/keranjang'); // Misalkan ada halaman konfirmasi
    } catch (err) {
        res.status(500).send('Error processing payment');
    }
  });

  app.post('/keranjang/bayar', async (req, res) => {
    const userId = req.session.userId;
    const totalHarga = parseFloat(req.body.total_harga);

    try {
        // 1. Mengurangi saldo user
        const user = await UserKeranjang.findById(userId);
        if (!user) {
            return res.status(404).send('User tidak ditemukan');
        }

        if (user.saldo < totalHarga) {
            return res.status(400).send('Saldo tidak mencukupi');
        }

        user.saldo -= totalHarga;
        await user.save();

        // 2. Menyimpan transaksi
        const transaksi = new KeranjangTransaksi({
            id_user: userId,
            total_harga: totalHarga,
            status: 'sukses'
        });
        await transaksi.save();

        // 3. Menghapus keranjang setelah pembayaran
        await Keranjang.deleteMany({ id_user: userId });

        // Redirect atau render halaman konfirmasi
        res.redirect('/keranjang'); // Misalkan ada halaman konfirmasi
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan saat memproses pembayaran');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});