const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// In-memory data store that mimics a database
let serverState = {
  transactions: []
};

// GET endpoint to sync data
app.get('/api/state', (req, res) => {
  res.json(serverState);
});

// POST endpoint to handle a transfer rule save
app.post('/api/transactions', (req, res) => {
  const { transaction } = req.body;
  if (!transaction) return res.status(400).json({ error: 'Missing transaction data' });
  
  serverState.transactions.unshift(transaction);
  res.status(201).json({ success: true, transactions: serverState.transactions });
});

app.listen(PORT, () => console.log(`🚀 Security Database Ledger running on port ${PORT}`));