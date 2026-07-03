import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AccountCard } from './components/AccountCard';
import { TransferForm } from './components/TransferForm';
import { StatementImporter } from './components/StatementImporter';
import { AnalyticsEngine } from './components/AnalyticsEngine';
import { TransactionHistory } from './components/TransactionHistory';
import { LiquidityBar } from './components/LiquidityBar';
import { AuditConsole } from './components/AuditConsole';
import { BudgetTracker } from './components/BudgetTracker';
import { BillSplitter } from './components/BillSplitter';
import './App.css';

function Dashboard() {
  const { state, reset } = useFinance();

  // 🚀 NEW: Dynamically fetches the current system date for the UI
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <p className="app-header__eyebrow" style={{ margin: 0 }}>Unlock'D · Round 1</p>
            {/* 🚀 NEW: The Ledger Date Badge */}
            <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              Ledger Date: {today}
            </span>
          </div>
          <h1 style={{ marginTop: '8px' }}>Transactions</h1>
        </div>
        <button className="app-header__reset" onClick={reset} type="button">
          Reset demo data
        </button>
      </header>

      <LiquidityBar />

      <BudgetTracker />
      <BillSplitter />

      <section className="accounts">
        {state.accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} />
        ))}
      </section>

      <main className="app-main">
        <StatementImporter />
        <AnalyticsEngine />
        <TransferForm />
        <TransactionHistory />
      </main>

      <AuditConsole />
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