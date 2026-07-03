import type { Account } from '../types';
import { formatCurrency } from '../utils/money';

export function AccountCard({ account }: { account: Account }) {
  return (
    <div className="account-card">
      <span className="account-card__label">{account.name}</span>
      <span className="account-card__balance">{formatCurrency(account.balance)}</span>
      <span className="account-card__id">{account.id}</span>
    </div>
  );
}
