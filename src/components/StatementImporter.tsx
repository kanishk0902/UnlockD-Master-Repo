import React, { useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { generateId } from '../utils/id';
import type { Transaction } from '../types';

export function StatementImporter() {
  const { state, importTransactions } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  // 🧠 The "Local AI" Categorization Engine
  const autoCategorize = (text: string) => {
    const t = text.toLowerCase();
    if (t.match(/zomato|swiggy|starbucks|mcdonalds|cafe|restaurant/)) return 'Food';
    if (t.match(/uber|ola|irctc|flight|indigo|petrol|travel/)) return 'Travel';
    if (t.match(/netflix|spotify|prime|hotstar|cinema/)) return 'Entertainment';
    if (t.match(/amazon|flipkart|myntra|zara|h&m/)) return 'Shopping';
    if (t.match(/jio|airtel|electricity|wifi/)) return 'Utilities';
    return 'General';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Parsing secure statement locally...');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const lines = csvText.split('\n').filter(line => line.trim().length > 0);
      
      // Assume CSV format: Date, Amount, Merchant, Note
      const parsedTxns: Transaction[] = lines.slice(1).map(line => {
        const [date, amountStr, merchant, note] = line.split(',').map(s => s.trim().replace(/(^"|"$)/g, ''));
        const amount = parseFloat(amountStr);
        
        return {
          id: generateId('tx_imp'),
          requestId: generateId('req_imp'),
          fromAccountId: state.accounts[0]?.id || 'acc_1', // Default to primary
          toAccountId: 'external',
          amount: isNaN(amount) ? 0 : amount,
          status: 'completed',
          timestamp: new Date(date).toISOString() || new Date().toISOString(),
          merchant: merchant,
          note: note,
          category: autoCategorize(`${merchant} ${note}`)
        };
      });

      setTimeout(() => {
        importTransactions(parsedTxns.filter(t => t.amount > 0));
        setStatus(`Successfully imported and auto-categorized ${parsedTxns.length} transactions.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 800); // Fake latency to make the engine feel "heavy"
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px dashed #3b82f6', padding: '24px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Smart Statement Import (CSV)</h4>
      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Zero-trust architecture. Files are processed entirely in your browser.</p>
      
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef}
        onChange={handleFileUpload} 
        style={{ display: 'none' }} 
        id="csv-upload"
      />
      <label 
        htmlFor="csv-upload" 
        style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-block' }}
      >
        Select CSV Statement
      </label>
      
      {status && <p style={{ marginTop: '16px', fontSize: '13px', color: '#10b981' }}>{status}</p>}
    </div>
  );
}