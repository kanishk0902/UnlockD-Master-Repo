import { useEffect, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { generateId } from '../utils/id';
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
  const { accounts, people = [] } = state;

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(''); 
  const [latencySimulation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const activeRequestId = useRef<string | null>(null);
  const pendingPayload = useRef<PendingPayload | null>(null);
  const pendingHash = useRef<string>('');
  const submitStartedAt = useRef<number>(0);

  useEffect(() => {
    if (!activeRequestId.current) return;
    const result = state.transactions.find((t: any) => t.requestId === activeRequestId.current || t.id === activeRequestId.current);
    if (!result) return;

    if ((result.status as any) === 'COMPLETED' || (result.status as any) === 'completed') {
      setFeedback({ kind: 'success', message: `Sent ₹${result.amount.toLocaleString('en-IN')} successfully.` });
      setAmountInput('');
      setNote('');
      setCategory(''); 
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

    const requestId = generateId('req');
    pendingPayload.current = { fromAccountId, toAccountId, amount: rupees, note: note.trim() || undefined, category: category || undefined };
    activeRequestId.current = requestId;
    submitStartedAt.current = Date.now();
    setSubmitting(true);
    setFeedback(null);

    pendingHash.current = await sha256Hex(`${requestId}|${fromAccountId}|${toAccountId}|${rupees}|${note}`);
    if (latencySimulation) { setTimeout(dispatchPending, 1500); } else { dispatchPending(); }
  };

  return (
    <div className="fintech-card">
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: '600' }}>Send Money</h3>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Execute a secure ledger transfer.</p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>From</label>
            <select className="fintech-input" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} disabled={submitting}>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>To</label>
            <select className="fintech-input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} disabled={submitting}>
              {[...accounts, ...people].map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Amount (₹)</label>
          <input className="fintech-input" type="number" placeholder="0.00" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} disabled={submitting} />
        </div>

        {state.budgets?.length > 0 && (
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Category</label>
            <select className="fintech-input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={submitting}>
              <option value="">None</option>
              {state.budgets.map((b: any) => <option key={b.id} value={b.category}>{b.category}</option>)}
            </select>
          </div>
        )}

        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Note</label>
          <input className="fintech-input" type="text" placeholder="Transaction note..." value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
        </div>

        {feedback && (
          <div style={{ fontSize: '12px', padding: '10px', borderRadius: '4px', backgroundColor: feedback.kind === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: feedback.kind === 'error' ? '#ef4444' : '#10b981' }}>
            {feedback.message}
          </div>
        )}

        <button type="submit" className="fintech-btn" disabled={submitting}>
          {submitting ? 'AUTHORIZING...' : 'AUTHORIZE TRANSACTION'}
        </button>
      </form>
    </div>
  );
}