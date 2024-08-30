const express = require('express');
const path = require('path');
const connection = require('./config/db');
const session = require('express-session');
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

app.get('/', (req, res) => {
    const query = 'SELECT * FROM menu';
    const userId = req.session.user ? req.session.userId : null;

    // Retrieve menu data and user balance
    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Error retrieving menu data');
        }

        if (userId) {
            connection.query('SELECT saldo FROM users WHERE id = ?', [userId], (err, balanceResults) => {
                if (err) {
                    return res.status(500).send('Error retrieving user balance');
                }

                const saldo = balanceResults[0] ? balanceResults[0].saldo : 0;
                res.render('index', { 
                    menus: results,
                    saldo: saldo // Send saldo to view
                });
            });
        } else {
            res.render('index', { 
                menus: results,
                saldo: 0 // Default saldo if not logged in
            });
        }
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    connection.query(query, [email, password], (err, results) => {
        if (err) {
            return res.status(500).send('Error during login');
        }
        if (results.length === 0) {
            return res.status(401).send('Email or password is incorrect');
        }
        const user = results[0];
        req.session.isLoggedIn = true;
        req.session.user = user;
        req.session.userId = user.id;

        // Fetch user balance after login
        connection.query('SELECT saldo FROM users WHERE id = ?', [user.id], (err, balanceResults) => {
            if (err) {
                return res.status(500).send('Error retrieving user balance');
            }
            req.session.user.saldo = balanceResults[0] ? balanceResults[0].saldo : 0;
            res.redirect('/');
        });
    });
});

// Menampilkan halaman register
app.get('/register', (req, res) => {
    res.render('register');
});

// Menangani formulir pendaftaran
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

    connection.query(query, [username, email, password], (err) => {
        if (err) {
            return res.status(500).send('Error during registration');
        }
        res.redirect('/login'); // Redirect to login page after successful registration
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error during logout');
        }
        res.redirect('/');
    });
});

app.post('/add-to-cart', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ message: 'Please login first' });
    }

    const { id_menu, jumlah } = req.body;
    const id_user = req.session.user.id;
    const query = 'INSERT INTO keranjang (id_user, id_menu, jumlah) VALUES (?, ?, ?)';

    connection.query(query, [id_user, id_menu, jumlah], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error adding to cart' });
        }
        res.json({ message: 'Item added to cart' });
    });
});

app.post('/buy', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ message: 'Please login first' });
    }

    const { id_menu, jumlah } = req.body;
    const id_user = req.session.user.id;

    // Fetch menu price
    connection.query('SELECT harga FROM menu WHERE id = ?', [id_menu], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error retrieving menu price' });
        }
        const price = results[0].harga;
        const totalPrice = price * jumlah;

        // Check user balance
        connection.query('SELECT saldo FROM users WHERE id = ?', [id_user], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Error retrieving user balance' });
            }
            const saldo = results[0].saldo;

            if (saldo < totalPrice) {
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            // Proceed with transaction
            connection.beginTransaction((err) => {
                if (err) {
                    return res.status(500).json({ message: 'Transaction error' });
                }

                const transactionQuery = 'INSERT INTO transaksi (id_user, total_harga, status) VALUES (?, ?, ?)';
                connection.query(transactionQuery, [id_user, totalPrice, 'pending'], (err, results) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(500).json({ message: 'Error creating transaction' });
                        });
                    }

                    const transactionId = results.insertId;
                    const cartQuery = 'INSERT INTO keranjang (id_user, id_menu, jumlah) VALUES (?, ?, ?)';
                    connection.query(cartQuery, [id_user, id_menu, jumlah], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                res.status(500).json({ message: 'Error adding to cart' });
                            });
                        }

                        connection.query('UPDATE users SET saldo = saldo - ? WHERE id = ?', [totalPrice, id_user], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    res.status(500).json({ message: 'Error updating balance' });
                                });
                            }

                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        res.status(500).json({ message: 'Transaction commit error' });
                                    });
                                }
                                res.json({ message: `Transaction successful. Total: ${totalPrice}` });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/add-balance', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;
    connection.query('SELECT saldo FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching balance');
        }

        const saldo = results[0] ? results[0].saldo : 0;
        res.render('add_balance', { errorMessage: null, successMessage: null, saldo: saldo });
    });
});


app.post('/add-balance', (req, res) => {
    const userId = req.session.userId; 
    const { amount} = req.body;

    if (!userId) {
        return res.redirect('/login');
    }

    if (amount <= 0) {
        return res.render('add_balance', { errorMessage: 'Jumlah saldo harus lebih dari 0', successMessage: null, saldo: 0 });
    }
    connection.query('UPDATE users SET saldo = saldo + ? WHERE id = ?', [amount, userId], (err) => {
        if (err) {
            return res.status(500).send('Error updating balance');
        }

        connection.query('SELECT saldo FROM users WHERE id = ?', [userId], (err, results) => {
            if (err) {
                return res.status(500).send('Error fetching updated balance');
            }

            const saldo = results[0] ? results[0].saldo : 0;
            res.render('add_balance', { errorMessage: null, successMessage: 'Saldo berhasil ditambahkan!', saldo: saldo });
        });
    });
});

app.get('/keranjang', async (req, res) => {
    const userId = req.session.userId; // Ambil userId dari session

    try {
        // 1. Ambil item keranjang berdasarkan user dan populasi data menu
        const items = await Keranjang.find({ id_user: userId }).populate('id_menu');

        // 2. Hitung total harga
        const totalHarga = items.reduce((total, item) => {
            return total + item.id_menu.harga * item.jumlah;
        }, 0);

        // 3. Ambil saldo user
        const user = await User.findById(userId);
        const saldo = user.saldo;

        // 4. Render view dengan data yang diperlukan
        res.render('keranjang', { items, totalHarga, user: { saldo } });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});


app.post('/keranjang/hapus', (req, res) => {
    const { id_keranjang } = req.body;
    const query = 'DELETE FROM keranjang WHERE id = ?';

    connection.query(query, [id_keranjang], (err, results) => {
        if (err) {
            return res.status(500).send('Error deleting item from cart');
        }
        res.redirect('/keranjang');
    });
});

app.post('/keranjang/bayar', (req, res) => {
    const userId = req.session.userId;
    const totalHarga = parseFloat(req.body.total_harga);

    // Query untuk mengurangi saldo user
    const updateSaldoQuery = `
        UPDATE users
        SET saldo = saldo - ?
        WHERE id = ?`;

    connection.query(updateSaldoQuery, [totalHarga, userId], (err) => {
        if (err) throw err;

        // Query untuk menyimpan transaksi
        const insertTransaksiQuery = `
            INSERT INTO transaksi (id_user, total_harga, status)
            VALUES (?, ?, 'sukses')`;

        connection.query(insertTransaksiQuery, [userId, totalHarga], (err) => {
            if (err) throw err;

            // Query untuk menghapus keranjang setelah pembayaran
            const deleteKeranjangQuery = `
                DELETE FROM keranjang
                WHERE id_user = ?`;

            connection.query(deleteKeranjangQuery, [userId], (err) => {
                if (err) throw err;

                // Redirect atau render halaman konfirmasi
                res.redirect('/keranjang'); // Misalkan ada halaman konfirmasi
            });
        });
    });
});





app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
