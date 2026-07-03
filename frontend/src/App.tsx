import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AccountCard } from './components/AccountCard';
import { TransferForm } from './components/TransferForm';
import { TransactionHistory } from './components/TransactionHistory';
import { LiquidityBar } from './components/LiquidityBar';
import { AuditConsole } from './components/AuditConsole';
import './App.css';

function Dashboard() {
  const { state, reset } = useFinance();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Unlock'D · Round 1</p>
          <h1>Transactions</h1>
        </div>
        <button className="app-header__reset" onClick={reset} type="button">
          Reset demo data
        </button>
      </header>

      <LiquidityBar />

      <section className="accounts">
        {state.accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} />
        ))}
      </section>

      <main className="app-main">
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
