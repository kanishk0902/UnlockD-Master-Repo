const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ transactions: [] }, null, 2));
}

app.get('/api/state', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  res.json(data);
});

app.post('/api/transactions', (req, res) => {
  const { transaction } = req.body;
  if (!transaction) return res.status(400).json({ error: 'Missing transaction data' });
  
  // Read current file state
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  data.transactions.unshift(transaction);
  
  // Write physically to disk
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  
  console.log(`📡 [Persistent Database] Hard-saved transaction: ${transaction.id} | Amount: ₹${transaction.amount}`);
  res.status(201).json({ success: true, transactions: data.transactions });
});

app.listen(PORT, () => console.log(`🚀 Persistent Database Ledger running on port ${PORT}`));
