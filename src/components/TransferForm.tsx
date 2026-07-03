import { useEffect, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { generateId } from '../utils/id';
import { formatCurrency } from '../utils/money';
import { sha256Hex } from '../utils/hash';
import type { TransferRequest } from '../types';

export const REASON_COPY: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Not enough balance in the source account.',
  DUPLICATE_REQUEST: "A matching transfer was just made — this looks like a duplicate.",
  SAME_ACCOUNT: 'Source and destination accounts must be different.',
  INVALID_AMOUNT: 'Enter an amount greater than zero.',
  ACCOUNT_NOT_FOUND: 'One of the selected accounts no longer exists.',
};

type PendingPayload = Omit<TransferRequest, 'requestId' | 'requestHash'>;

export function TransferForm() {
  const { state, transfer } = useFinance();
  const { accounts } = state;

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(''); // 🚀 NEW: Budget Category State
  const [latencySimulation, setLatencySimulation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const activeRequestId = useRef<string | null>(null);
  const pendingPayload = useRef<PendingPayload | null>(null);
  const pendingHash = useRef<string>('');
  const submitStartedAt = useRef<number>(0);

  useEffect(() => {
    if (!activeRequestId.current) return;
    const result = state.transactions.find((t) => (t as any).requestId === activeRequestId.current || t.id === activeRequestId.current);
    if (!result) return;

    setLastLatencyMs(Date.now() - submitStartedAt.current);

    // Bypassing strict type overlap checks with 'as any'
    if ((result.status as any) === 'COMPLETED' || (result.status as any) === 'completed') {
      setFeedback({ kind: 'success', message: `Sent ₹${result.amount.toLocaleString('en-IN')} successfully.` });
      setAmountInput('');
      setNote('');
      setCategory(''); // 🚀 NEW: Clear category on success
    } else {
      setFeedback({
        kind: 'error',
        message: REASON_COPY[(result as any).reason ?? ''] ?? 'The transfer could not be completed.',
      });
    }

    activeRequestId.current = null;
    pendingPayload.current = null;
    setSubmitting(false);
  }, [state.transactions]);

  const dispatchPending = () => {
    if (!activeRequestId.current || !pendingPayload.current) return;
    transfer({
      requestId: activeRequestId.current,
      requestHash: pendingHash.current,
      ...pendingPayload.current,
    } as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeRequestId.current) {
      dispatchPending();
      return;
    }

    const rupees = parseFloat(amountInput);
    if (Number.isNaN(rupees) || rupees <= 0) {
      setFeedback({ kind: 'error', message: REASON_COPY.INVALID_AMOUNT });
      return;
    }

    const amount = rupees; 
    const requestId = generateId('req');

    pendingPayload.current = {
      fromAccountId,
      toAccountId,
      amount,
      note: note.trim() || undefined,
      category: category || undefined, // 🚀 NEW: Attach category to the payload
    };
    activeRequestId.current = requestId;
    submitStartedAt.current = Date.now();
    setSubmitting(true);
    setFeedback(null);

    // Kept your exact hash generation logic so it doesn't break your latency pipeline
    pendingHash.current = await sha256Hex(
      `${requestId}|${fromAccountId}|${toAccountId}|${amount}|${note}`
    );

    if (latencySimulation) {
      setTimeout(dispatchPending, 1500);
    } else {
      dispatchPending();
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>Send money</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8' }}>From</label>
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} disabled={submitting} style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', fontFamily: 'monospace' }}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8' }}>To</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} disabled={submitting} style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', fontFamily: 'monospace' }}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8' }}>Amount (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={submitting}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>

        {/* 🚀 NEW: Budget Category Dropdown injected into your original layout */}
        {state.budgets && state.budgets.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8' }}>Budget Category (Optional)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', fontFamily: 'monospace' }}
            >
              <option value="">None (Don't track)</option>
              {state.budgets.map((b) => (
                <option key={b.id} value={b.category}>
                  {b.category}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8' }}>Note (optional)</label>
          <input
            type="text"
            placeholder="What's this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            maxLength={80}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
          <input 
            type="checkbox" 
            id="latency" 
            checked={latencySimulation} 
            onChange={e => setLatencySimulation(e.target.checked)} 
            style={{ marginTop: '2px' }}
          />
          <label htmlFor="latency" style={{ fontSize: '11px', color: '#94a3b8', cursor: 'pointer', lineHeight: '1.4' }}>
            Simulate network latency (2G/3G spike).<br/>
            <span style={{ color: '#4b5563' }}>Widens the in-flight window — try spam-clicking Send while it's on</span>
          </label>
        </div>

        {feedback && (
          <div style={{ padding: '12px', borderRadius: '6px', fontSize: '12px', backgroundColor: feedback.kind === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: feedback.kind === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${feedback.kind === 'success' ? '#10b981' : '#ef4444'}` }}>
            {feedback.message}
          </div>
        )}

        {lastLatencyMs !== null && (
           <p style={{ fontSize: '11px', color: '#10b981', margin: '0', textAlign: 'right' }}>Pipeline latency: {lastLatencyMs}ms</p>
        )}

        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#10b981', color: '#0b0f19', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
          {submitting ? 'Processing…' : 'Send money'}
        </button>
      </form>
    </div>
  );
}