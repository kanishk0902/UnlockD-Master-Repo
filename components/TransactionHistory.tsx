import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatTimestamp } from '../utils/money';
import { REASON_COPY } from './TransferForm';

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  failed: 'Failed',
  reversed: 'Reversed',
};

export function TransactionHistory() {
  const { state } = useFinance();
  const { transactions, accounts } = state;

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown account';

  if (transactions.length === 0) {
    return (
      <div className="history">
        <h2>Transaction history</h2>
        <p className="history__empty">No transfers yet. Send money to see it show up here.</p>
      </div>
    );
  }

  return (
    <div className="history">
      <h2>Transaction history</h2>
      <div className="history__table" role="table">
        <div className="history__row history__row--head" role="row">
          <span role="columnheader">Status</span>
          <span role="columnheader">From</span>
          <span role="columnheader">To</span>
          <span role="columnheader">Amount</span>
          <span role="columnheader">Timestamp</span>
          <span role="columnheader">Detail</span>
        </div>
        {transactions.map((t) => (
          <div className="history__row" role="row" key={t.id}>
            <span role="cell">
              <span className={`badge badge--${t.status}`}>{STATUS_LABEL[t.status]}</span>
            </span>
            <span role="cell">{accountName(t.fromAccountId)}</span>
            <span role="cell">{accountName(t.toAccountId)}</span>
            <span role="cell" className="history__amount">{formatCurrency(t.amount)}</span>
            <span role="cell" className="history__time">{formatTimestamp(t.timestamp)}</span>
            <span role="cell" className="history__detail">
              {t.status === 'failed'
                ? REASON_COPY[t.failureReason ?? ''] ?? '—'
                : t.note || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
