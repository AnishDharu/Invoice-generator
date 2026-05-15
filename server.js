require('dotenv').config();

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`Invoice Generator running at http://localhost:${PORT}`);
});