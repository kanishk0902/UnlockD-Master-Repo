import { useEffect, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { generateId } from '../utils/id';
import { formatCurrency, rupeesToPaise } from '../utils/money';
import { sha256Hex } from '../utils/hash';
import { ToggleSwitch } from './ToggleSwitch';
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
  const [latencySimulation, setLatencySimulation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  // These three refs together describe "the request currently in flight":
  // a fixed requestId + fixed payload + its precomputed hash. Spam-clicking
  // while they're set replays the exact same request, which is what lets
  // the reducer's idempotency guard demonstrate a real, not simulated, drop.
  const activeRequestId = useRef<string | null>(null);
  const pendingPayload = useRef<PendingPayload | null>(null);
  const pendingHash = useRef<string>('');
  const submitStartedAt = useRef<number>(0);

  // Resolves once the in-flight request's outcome lands in the ledger —
  // works whichever dispatch happened to "win" the race, since they all
  // shared the same requestId.
  useEffect(() => {
    if (!activeRequestId.current) return;
    const result = state.transactions.find((t) => t.requestId === activeRequestId.current);
    if (!result) return;

    setLastLatencyMs(Date.now() - submitStartedAt.current);

    if (result.status === 'completed') {
      setFeedback({ kind: 'success', message: `Sent ${formatCurrency(result.amount)} successfully.` });
      setAmountInput('');
      setNote('');
    } else {
      setFeedback({
        kind: 'error',
        message: REASON_COPY[result.failureReason ?? ''] ?? 'The transfer could not be completed.',
      });
    }

    activeRequestId.current = null;
    pendingPayload.current = null;
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.transactions]);

  const dispatchPending = () => {
    if (!activeRequestId.current || !pendingPayload.current) return;
    transfer({
      requestId: activeRequestId.current,
      requestHash: pendingHash.current,
      ...pendingPayload.current,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // A request is already in flight: this click is a deliberate spam /
    // stress-test of the same request. Replay it immediately with the
    // identical requestId + payload — no new validation, no new hash —
    // so the pipeline sees it as a genuine duplicate, not a new transfer.
    if (activeRequestId.current) {
      dispatchPending();
      return;
    }

    const rupees = parseFloat(amountInput);
    if (Number.isNaN(rupees) || rupees <= 0) {
      setFeedback({ kind: 'error', message: REASON_COPY.INVALID_AMOUNT });
      return;
    }

    const amount = rupeesToPaise(rupees);
    const requestId = generateId('req');

    pendingPayload.current = {
      fromAccountId,
      toAccountId,
      amount,
      note: note.trim() || undefined,
    };
    activeRequestId.current = requestId;
    submitStartedAt.current = Date.now();
    setSubmitting(true);
    setFeedback(null);

    // Real SHA-256 digest of the canonical request, computed client-side
    // via the Web Crypto API — this is what shows up in the security
    // telemetry console as the "idempotency token".
    pendingHash.current = await sha256Hex(
      `${requestId}|${fromAccountId}|${toAccountId}|${amount}|${note}`
    );

    if (latencySimulation) {
      // Deliberately widen the in-flight window so a burst of clicks
      // during the "network delay" has time to actually happen — this is
      // what makes the duplicate-drop visible in the console rather than
      // resolving in a single frame.
      setTimeout(dispatchPending, 1500);
    } else {
      dispatchPending();
    }
  };

  return (
    <form className="transfer-form" onSubmit={handleSubmit}>
      <h2>Send money</h2>

      <label>
        From
        <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} disabled={submitting}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>

      <label>
        To
        <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} disabled={submitting}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>

      <label>
        Amount (₹)
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          disabled={submitting}
          required
        />
      </label>

      <label>
        Note (optional)
        <input
          type="text"
          placeholder="What's this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          maxLength={80}
        />
      </label>

      <ToggleSwitch
        checked={latencySimulation}
        onChange={setLatencySimulation}
        label="Simulate network latency (2G/3G spike)"
        hint="Widens the in-flight window — try spam-clicking Send while it's on"
      />

      {/* Intentionally never disabled while submitting: this is what lets
          a spam-click during the simulated delay reach handleSubmit and
          get caught by the idempotency guard, instead of being blocked
          by the UI before it ever gets there. */}
      <button type="submit">
        {submitting ? 'Processing…' : 'Send money'}
      </button>

      {feedback && (
        <p className={`transfer-form__feedback transfer-form__feedback--${feedback.kind}`} role="status">
          {feedback.message}
        </p>
      )}

      {lastLatencyMs !== null && (
        <p className="transfer-form__latency">Pipeline latency: {lastLatencyMs}ms</p>
      )}
    </form>
  );
}
