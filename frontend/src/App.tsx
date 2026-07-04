import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { AccountCard } from './components/AccountCard';
import { TransferForm } from './components/TransferForm';
import { StatementImporter } from './components/StatementImporter';
import { AnalyticsEngine } from './components/AnalyticsEngine';
import { TransactionHistory } from './components/TransactionHistory';
import { LiquidityBar } from './components/LiquidityBar';
import { AuditConsole } from './components/AuditConsole';
import { BudgetTracker } from './components/BudgetTracker';
import { BillSplitter } from './components/BillSplitter';
import { LoginScreen } from './components/LoginScreen';
import { MoneyExhaustionWatch } from './components/MoneyExhaustionWatch';
import LanguageSwitcher from "./components/LanguageSwitcher";
import './App.css';

function Dashboard() {
  const { state, reset } = useFinance();
  const { translate } = useLanguage();

  const [view, setView] = useState<'dashboard' | 'analytics' | 'splitwise' | 'insights'>('dashboard');

  const navItemStyle = (item: string) => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: view === item ? '#10b981' : '#4b5563',
    fontWeight: view === item ? 'bold' : 'normal',
    fontSize: '14px',
    borderBottom: view === item ? '2px solid #10b981' : 'none',
    paddingBottom: '4px',
    transition: 'all 0.2s ease'
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Unlock'D · {view.toUpperCase()}</p>
          <h1>{translate("transactions")}</h1>
          <p>{translate("liquidityLedger")}</p>

          <nav style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
            {(['dashboard', 'analytics', 'splitwise', 'insights'] as const).map((item) => (
              <button 
                key={item} 
                onClick={() => setView(item)} 
                style={navItemStyle(item)}
              >
                {translate(item as any) || item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitcher />
          <button className="app-header__reset" onClick={reset}>
            {translate("resetDemoData")}
          </button>
        </div>
      </header>

      <main style={{ minHeight: '60vh', padding: '32px 0' }}>
        {view === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <LiquidityBar />
            <section className="accounts">
              {state.accounts?.map((acc: any) => <AccountCard key={acc.id} account={acc} />)}
            </section>
            <TransferForm />
            <BudgetTracker />
            <TransactionHistory />
          </div>
        )}

        {view === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <AnalyticsEngine />
            <TransferForm />
          </div>
        )}

        {view === 'splitwise' && <BillSplitter />}

        {view === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <MoneyExhaustionWatch />
            <StatementImporter />
          </div>
        )}
      </main>

      <footer style={{ marginTop: '48px', borderTop: '1px solid #1e293b', paddingTop: '24px' }}>
        <AuditConsole />
      </footer>
    </div>
  );
}

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <LanguageProvider>
      <FinanceProvider>
        {!isUnlocked ? (
          <LoginScreen onUnlock={() => setIsUnlocked(true)} />
        ) : (
          <Dashboard />
        )}
      </FinanceProvider>
    </LanguageProvider>
  );
}