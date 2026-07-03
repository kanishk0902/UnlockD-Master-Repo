import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/money';
import type { Transaction } from '../types';

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  backgroundColor: '#1f2937',
  color: 'white',
  border: '1px solid #374151',
  fontFamily: 'monospace',
  fontSize: '13px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(val: string): string {
  if (/[",\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

export function TransactionHistory() {
  const { state, updateTransaction } = useFinance();
  const { accounts, transactions, budgets } = state;

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? 'Unknown account';

  // ---- filter / search state -------------------------------------------------
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('__all__');
  const [accountFilter, setAccountFilter] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date_desc');
  const [showFilters, setShowFilters] = useState(false);

  // ---- inline edit state -------------------------------------------------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editNote, setEditNote] = useState('');

  const knownCategories = useMemo(() => {
    const set = new Set<string>();
    budgets.forEach(b => set.add(b.category));
    transactions.forEach(t => t.category && set.add(t.category));
    return Array.from(set).sort();
  }, [budgets, transactions]);

  const merchantOf = (tx: Transaction) => tx.merchant || accountName(tx.toAccountId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = amountMin ? parseFloat(amountMin) : null;
    const max = amountMax ? parseFloat(amountMax) : null;
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;

    let list = transactions.filter(tx => {
      if (q) {
        const haystack = [
          tx.note ?? '',
          merchantOf(tx),
          accountName(tx.fromAccountId),
          accountName(tx.toAccountId),
          tx.category ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryFilter !== '__all__') {
        if (categoryFilter === '__none__' ? !!tx.category : tx.category !== categoryFilter) return false;
      }
      if (accountFilter !== '__all__' && tx.fromAccountId !== accountFilter && tx.toAccountId !== accountFilter) {
        return false;
      }
      const ts = Date.parse(tx.timestamp);
      if (from !== null && ts < from) return false;
      if (to !== null && ts > to) return false;
      if (min !== null && tx.amount < min) return false;
      if (max !== null && tx.amount > max) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'date_asc': return Date.parse(a.timestamp) - Date.parse(b.timestamp);
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'date_desc':
        default: return Date.parse(b.timestamp) - Date.parse(a.timestamp);
      }
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, query, categoryFilter, accountFilter, dateFrom, dateTo, amountMin, amountMax, sortKey, accounts]);

  const hasActiveFilters = query || categoryFilter !== '__all__' || accountFilter !== '__all__' || dateFrom || dateTo || amountMin || amountMax;

  const clearFilters = () => {
    setQuery('');
    setCategoryFilter('__all__');
    setAccountFilter('__all__');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  };

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditCategory(tx.category ?? '');
    setEditMerchant(merchantOf(tx));
    setEditNote(tx.note ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (tx: Transaction) => {
    updateTransaction(tx.id, {
      category: editCategory || undefined,
      merchant: editMerchant.trim() || undefined,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  };

  const exportCsv = () => {
    const header = ['Date', 'Description/Note', 'Merchant', 'From Account', 'To Account', 'Category', 'Amount (INR)', 'Status'];
    const rows = filtered.map(tx => [
      new Date(tx.timestamp).toISOString(),
      tx.note ?? '',
      merchantOf(tx),
      accountName(tx.fromAccountId),
      accountName(tx.toAccountId),
      tx.category ?? '',
      (tx.amount / 100).toFixed(2),
      tx.status,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => csvEscape(String(v))).join(',')).join('\n');
    downloadFile(`transactions_${Date.now()}.csv`, csv, 'text/csv');
  };

  const exportJson = () => {
    downloadFile(`transactions_${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json');
  };

  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Transaction history</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            style={{ padding: '8px 12px', fontSize: '11px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', cursor: filtered.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportJson}
            disabled={filtered.length === 0}
            style={{ padding: '8px 12px', fontSize: '11px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', cursor: filtered.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search by description or merchant…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => setShowFilters(s => !s)}
          style={{ padding: '10px 14px', fontSize: '12px', backgroundColor: showFilters ? '#1f2937' : 'transparent', color: '#e2e8f0', border: '1px solid #374151', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          Filters{hasActiveFilters ? ' •' : ''}
        </button>
      </div>

      {showFilters && (
        <div style={{ backgroundColor: '#0b0f19', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle}>
              <option value="__all__">All categories</option>
              <option value="__none__">Uncategorized</option>
              {knownCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Account</label>
            <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={inputStyle}>
              <option value="__all__">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>From date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>To date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Min amount (₹)</label>
            <input type="number" min="0" placeholder="0" value={amountMin} onChange={e => setAmountMin(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Max amount (₹)</label>
            <input type="number" min="0" placeholder="Any" value={amountMax} onChange={e => setAmountMax(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Sort by</label>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} style={inputStyle}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              style={{ width: '100%', padding: '10px', fontSize: '12px', backgroundColor: 'transparent', color: hasActiveFilters ? '#ef4444' : '#4b5563', border: `1px solid ${hasActiveFilters ? '#ef4444' : '#334155'}`, borderRadius: '6px', cursor: hasActiveFilters ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
        <span>{filtered.length} of {transactions.length} transaction{transactions.length === 1 ? '' : 's'}</span>
        {filtered.length > 0 && <span>Total: {formatCurrency(totalAmount)}</span>}
      </div>

      {transactions.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>No transfers yet. Send money to see it show up here.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>No transactions match your search or filters.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
          {filtered.map(tx => {
            const statusStr = String(tx.status).toLowerCase();
            const isSuccess = statusStr === 'completed' || statusStr === 'success';
            const isEditing = editingId === tx.id;

            return (
              <div key={tx.id} style={{ padding: '14px', backgroundColor: '#0b0f19', borderRadius: '8px', border: `1px solid ${isEditing ? '#334155' : '#1e293b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {merchantOf(tx)}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#94a3b8' }}>
                      {accountName(tx.fromAccountId)} → {accountName(tx.toAccountId)}
                    </p>
                    {tx.note && !isEditing && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>“{tx.note}”</p>
                    )}
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Status: <span style={{ color: isSuccess ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>{tx.status}</span></span>
                      {tx.category && (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '11px' }}>
                          {tx.category}
                        </span>
                      )}
                      {tx.edited && <span style={{ color: '#64748b', fontSize: '10px' }}>(edited)</span>}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
                      {formatCurrency(tx.amount)}
                    </p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#64748b' }}>
                      {new Date(tx.timestamp).toLocaleString('en-IN')}
                    </p>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Merchant</label>
                      <input type="text" value={editMerchant} onChange={e => setEditMerchant(e.target.value)} style={inputStyle} maxLength={60} />
                    </div>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={inputStyle}>
                        <option value="">Uncategorized</option>
                        {knownCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Note / description</label>
                      <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} style={inputStyle} maxLength={80} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={cancelEdit} style={{ padding: '8px 14px', fontSize: '12px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                      <button type="button" onClick={() => saveEdit(tx)} style={{ padding: '8px 14px', fontSize: '12px', backgroundColor: '#10b981', color: '#0b0f19', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
