import React from 'react';
import { useFinance } from '../context/FinanceContext';

export function LiquidityBar() {
  const { state } = useFinance();

  // Dynamically calculate the real total balance
  const totalBalance = state.accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
        <span style={{ color: '#94a3b8' }}>Liquidity Pool Distribution</span>
        <span style={{ fontWeight: 'bold' }}>{"₹"}{totalBalance.toLocaleString('en-IN')} total</span>
      </div>
      
      <div style={{ display: 'flex', gap: '2px', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
        {state.accounts.map((acc, i) => {
          const percentage = totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0;
          const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
          const color = colors[i % colors.length];

          return (
            <div
              key={acc.id}
              style={{ width: `${percentage}%`, backgroundColor: color }}
              title={`${acc.name}: ${percentage.toFixed(1)}%`}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
        {state.accounts.map((acc, i) => {
          const percentage = totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0;
          return (
            <span key={acc.id}>
              {acc.name} <strong style={{ color: '#f8fafc' }}>{percentage.toFixed(1)}%</strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}