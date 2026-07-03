import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/money';

export function AnalyticsEngine() {
  const { state } = useFinance();

  const { categoryTotals, recurringTraps } = useMemo(() => {
    const totals: Record<string, number> = {};
    const merchantCounts: Record<string, number> = {};
    const merchantAmounts: Record<string, number> = {};

    state.transactions.forEach(tx => {
      // Aggregate Categories
      const cat = tx.category || 'General';
      totals[cat] = (totals[cat] || 0) + tx.amount;

      // Identify Recurring (Same merchant, multiple times)
      if (tx.merchant) {
        merchantCounts[tx.merchant] = (merchantCounts[tx.merchant] || 0) + 1;
        merchantAmounts[tx.merchant] = tx.amount; // Store latest amount
      }
    });

    const traps = Object.keys(merchantCounts)
      .filter(m => merchantCounts[m] >= 2)
      .map(m => ({ merchant: m, count: merchantCounts[m], amount: merchantAmounts[m] }));

    return { categoryTotals: totals, recurringTraps: traps };
  }, [state.transactions]);

  const maxCatAmount = Math.max(...Object.values(categoryTotals), 1);

  if (state.transactions.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>Spending Analytics</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Visual Bar Chart */}
        <div>
          <h5 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>Volume by Category</h5>
          {Object.entries(categoryTotals).map(([cat, amount]) => (
            <div key={cat} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#f8fafc' }}>{cat}</span>
                <span style={{ color: '#94a3b8' }}>{formatCurrency(amount)}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(amount / maxCatAmount) * 100}%`, height: '100%', backgroundColor: '#3b82f6' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recurring Detection */}
        <div>
          <h5 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>Recurring Expenses Detected</h5>
          {recurringTraps.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b' }}>No recurring patterns detected yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recurringTraps.map(trap => (
                <div key={trap.merchant} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>{trap.merchant}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Detected {trap.count} times</p>
                  </div>
                  <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold' }}>~{formatCurrency(trap.amount)}/cycle</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}