const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint (Contoh)
app.get('/api/data', (req, res) => {
    res.json({
        message: 'Hello from the back-end!'
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
