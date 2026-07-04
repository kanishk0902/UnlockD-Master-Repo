import React from 'react';
import { useLanguage } from '../context/LanguageContext';   // ← Added
import { Account } from '../types';

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const { translate } = useLanguage();   // ← Added

  return (
    <div className="account-card" style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', fontFamily: 'monospace' }}>
      <span className="account-card__label" style={{ color: '#94a3b8', fontSize: '12px' }}>
        {account.name}
      </span>
      <p className="account-card__balance" style={{ margin: '8px 0 2px 0', fontSize: '28px', fontWeight: 'bold', color: '#f8fafc' }}>
        ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>
      <span className="account-card__id" style={{ fontSize: '11px', color: '#4b5563' }}>
        {account.id}
      </span>
    </div>
  );
}