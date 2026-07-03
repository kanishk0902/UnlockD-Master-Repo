import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/money';

export function BudgetTracker() {
  const { state, addBudget, resetBudgets, deleteBudget } = useFinance();
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');

  // 🚀 Auto-Reset Watcher
  useEffect(() => {
    if (state.budgets.length === 0) return;

    const currentMonth = new Date().getMonth();
    const lastResetDate = new Date(state.budgets[0].lastResetDate);
    const lastResetMonth = lastResetDate.getMonth();

    if (currentMonth !== lastResetMonth) {
      console.log("New month detected! Resetting all budgets to zero.");
      resetBudgets();
    }
  }, [state.budgets, resetBudgets]);

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitAmount = parseFloat(newLimit); // Strictly Rupees
    if (newCategory.trim() && limitAmount > 0) {
      addBudget(newCategory.trim(), limitAmount);
      setNewCategory('');
      setNewLimit('');
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>Smart Budgeting</h3>
      </div>

      <form onSubmit={handleAddBudget} style={{ display: 'flex', gap: '12px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #1e293b' }}>
        <input 
          type="text" 
          placeholder="New Category (e.g. Utilities)" 
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
        />
        <input 
          type="number" 
          placeholder="Monthly Limit (₹)" 
          value={newLimit}
          onChange={(e) => setNewLimit(e.target.value)}
          style={{ width: '150px', padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
        />
        <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Add Budget
        </button>
      </form>
      
      {state.budgets.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '10px 0' }}>No budgets active. Create your first target limit above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {state.budgets.map((budget) => {
            const remaining = budget.limit - budget.spent;
            const utilization = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
            
            let barColor = '#10b981'; 
            let warningText = null;

            if (utilization >= 100) {
              barColor = '#ef4444';
              warningText = "Budget exceeded!";
            } else if (utilization >= 80) {
              barColor = '#f59e0b';
              warningText = "Approaching limit";
            }

            return (
              <div key={budget.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px' }}>
                  <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{budget.category}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#94a3b8' }}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                    </span>
                    <button 
                      onClick={() => deleteBudget(budget.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '16px', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}
                      title="Delete Budget"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{ width: '100%', height: '10px', backgroundColor: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(utilization, 100)}%`, 
                      height: '100%', 
                      backgroundColor: barColor,
                      transition: 'width 0.4s ease-in-out, background-color 0.4s ease-in-out'
                    }} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: barColor, fontWeight: warningText ? 'bold' : 'normal' }}>
                    {warningText}
                  </span>
                  <span style={{ color: remaining < 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                    {remaining < 0 ? 'Over budget by ' : 'Remaining: '}
                    {formatCurrency(Math.abs(remaining))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}