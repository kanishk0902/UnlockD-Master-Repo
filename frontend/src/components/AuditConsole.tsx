import React from 'react';
import { useFinance } from '../context/FinanceContext';
import type { Transaction } from '../types';

export function AuditConsole() {
  const { state } = useFinance();

  // Safely converting statuses to lowercase to prevent case-mismatch bugs
  const totalSettled = state.transactions
    .filter((t: Transaction) => {
      const s = String(t.status).toLowerCase();
      return s === 'completed' || s === 'success';
    })
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const interceptedAttacks = state.transactions
    .filter((t: Transaction) => {
      const s = String(t.status).toLowerCase();
      return s === 'failed' || s === 'rejected' || s === 'dropped';
    }).length;

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Security Telemetry</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ backgroundColor: '#0b0f19', border: '1px solid #1e293b', padding: '16px', borderRadius: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>TOTAL SETTLED VOLUME</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {"₹"}{totalSettled.toLocaleString('en-IN')}
          </p>
        </div>
        
        <div style={{ backgroundColor: '#0b0f19', border: '1px solid #1e293b', padding: '16px', borderRadius: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>INTERCEPTED ATTACKS</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {interceptedAttacks} Blocked
          </p>
        </div>
      </div>
    </div>
  );
}