import React from 'react';
import { useFinance } from '../context/FinanceContext';

export function TransactionHistory() {
  const { state } = useFinance();

  // Show newest transactions at the top
  const sortedTxs = [...state.transactions].reverse();

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>Transaction history</h3>
      
      {sortedTxs.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>No transfers yet. Send money to see it show up here.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
          {sortedTxs.map(tx => {
            const statusStr = String(tx.status).toLowerCase();
            const isSuccess = statusStr === 'completed' || statusStr === 'success';
            
            return (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#0b0f19', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>Transfer</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    Status: <span style={{ color: isSuccess ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>{tx.status}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
                    {"₹"}{tx.amount.toLocaleString('en-IN')}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}