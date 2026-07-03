import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';

// Components
import { AccountCard } from './components/AccountCard';
import { TransferForm } from './components/TransferForm';
import { TransactionHistory } from './components/TransactionHistory';
import { LiquidityBar } from './components/LiquidityBar';
import { BudgetTracker } from './components/BudgetTracker';
import { BillSplitter } from './components/BillSplitter';
import { StatementImporter } from './components/StatementImporter';
import { AnalyticsEngine } from './components/AnalyticsEngine';
import { AuditConsole } from './components/AuditConsole';

import './App.css';

function Dashboard() {
  const { state, reset } = useFinance();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f8fafc', padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Unlock'D · Production Build</p>
            <h1 style={{ margin: 0, fontSize: '28px' }}>Financial Control Center</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{today}</p>
          </div>
          <button onClick={reset} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            Factory Reset
          </button>
        </div>
      </header>

      {/* STACKED CONTENT: The Vertical Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <LiquidityBar />
        
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {state.accounts.map((acc) => (
            <div key={acc.id} style={{ minWidth: '280px' }}>
              <AccountCard account={acc} />
            </div>
          ))}
        </div>

        <BudgetTracker />
        <BillSplitter />
        <StatementImporter />
        <AnalyticsEngine />
        <TransferForm />
        <TransactionHistory />
        <AuditConsole />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <Dashboard />
    </FinanceProvider>
  );
}