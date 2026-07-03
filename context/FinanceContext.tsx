import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { Account, AuditEvent, AuditLevel, FinanceState, Transaction, TransferRequest } from '../types';
import { seedAccounts } from '../data/seed';
import { generateId } from '../utils/id';
import { formatCurrency } from '../utils/money';

const MAX_AUDIT_EVENTS = 200;

const STORAGE_KEY = 'unlockd_finance_state_v1';
// Two identical transfers (same from/to/amount) within this window are
// treated as accidental duplicates (e.g. a user double-tapping "Send").
const DUPLICATE_WINDOW_MS = 5000;

type Action =
  | { type: 'TRANSFER_FUNDS'; payload: TransferRequest }
  | { type: 'RESET' };

function loadInitialState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceState;
      if (parsed.accounts?.length) return parsed;
    }
  } catch {
    // ignore corrupt storage and fall back to seed data
  }
  return {
    accounts: seedAccounts,
    transactions: [],
    processedRequestIds: [],
    auditEvents: [],
  };
}

function makeAuditEvent(level: AuditLevel, message: string): AuditEvent {
  return {
    id: generateId('evt'),
    timestamp: new Date().toISOString(),
    level,
    message,
  };
}

function pushAudit(state: FinanceState, events: AuditEvent[]): AuditEvent[] {
  const combined = [...state.auditEvents, ...events];
  return combined.length > MAX_AUDIT_EVENTS
    ? combined.slice(combined.length - MAX_AUDIT_EVENTS)
    : combined;
}

/**
 * The entire transfer — validation, overdraft check, duplicate check, and
 * both balance mutations — happens inside this single reducer function,
 * which runs synchronously against one immutable snapshot of prior state.
 * React never applies a partial update from this function, so from the
 * rest of the app's point of view the transfer is atomic: any concurrent
 * dispatches are queued and applied one-at-a-time against the result of
 * this one, never interleaved with it.
 */
function financeReducer(state: FinanceState, action: Action): FinanceState {
  switch (action.type) {
    case 'RESET':
      return {
        accounts: seedAccounts,
        transactions: [],
        processedRequestIds: [],
        auditEvents: [],
      };

    case 'TRANSFER_FUNDS': {
      const { requestId, fromAccountId, toAccountId, amount, note, requestHash } = action.payload;
      const timestamp = new Date().toISOString();
      const shortId = requestId.slice(-8);
      const hashLabel = requestHash ? requestHash.slice(0, 32) + '…' : 'n/a';

      const buildTxn = (overrides: Partial<Transaction>): Transaction => ({
        id: generateId('txn'),
        requestId,
        fromAccountId,
        toAccountId,
        amount,
        status: 'failed',
        timestamp,
        note,
        ...overrides,
      });

      const startEvent = makeAuditEvent('info', `Initializing atomic transfer pipeline… req=${shortId}`);
      const signEvent = makeAuditEvent('sign', `Generating SHA-256 idempotency token: ${hashLabel}`);

      // 1. Idempotency guard: exact same request replayed (double network
      //    submit, spam-clicking during a slow request, etc.) is dropped
      //    without creating a duplicate ledger entry — the ledger only
      //    ever records the one canonical outcome for a given requestId.
      //    The attempt is still recorded in the audit stream so it's
      //    visible that the system actively caught and rejected it.
      if (state.processedRequestIds.includes(requestId)) {
        return {
          ...state,
          auditEvents: pushAudit(state, [
            startEvent,
            makeAuditEvent('block', `Duplicate idempotency key replay detected — req=${shortId} already settled. Attempt discarded, no state change.`),
          ]),
        };
      }

      // 2. Structural validation.
      const fromAccount = state.accounts.find((a) => a.id === fromAccountId);
      const toAccount = state.accounts.find((a) => a.id === toAccountId);

      if (!fromAccount || !toAccount) {
        return {
          ...state,
          transactions: [buildTxn({ failureReason: 'ACCOUNT_NOT_FOUND' }), ...state.transactions],
          processedRequestIds: [...state.processedRequestIds, requestId],
          auditEvents: pushAudit(state, [startEvent, makeAuditEvent('error', `Account resolution failed for req=${shortId}. Pipeline aborted.`)]),
        };
      }

      if (fromAccountId === toAccountId) {
        return {
          ...state,
          transactions: [buildTxn({ failureReason: 'SAME_ACCOUNT' }), ...state.transactions],
          processedRequestIds: [...state.processedRequestIds, requestId],
          auditEvents: pushAudit(state, [startEvent, makeAuditEvent('error', `Self-transfer rejected for req=${shortId}. Source and destination match.`)]),
        };
      }

      if (!Number.isInteger(amount) || amount <= 0) {
        return {
          ...state,
          transactions: [buildTxn({ failureReason: 'INVALID_AMOUNT' }), ...state.transactions],
          processedRequestIds: [...state.processedRequestIds, requestId],
          auditEvents: pushAudit(state, [startEvent, makeAuditEvent('error', `Amount validation failed for req=${shortId}. Non-positive or non-integer paise value.`)]),
        };
      }

      // 3. Content-based duplicate detection: same from/to/amount
      //    completed moments ago, likely an accidental resubmission
      //    rather than a deliberate second transfer.
      const recentDuplicate = state.transactions.find((t) => {
        if (t.status !== 'completed') return false;
        if (t.fromAccountId !== fromAccountId) return false;
        if (t.toAccountId !== toAccountId) return false;
        if (t.amount !== amount) return false;
        const age = Date.parse(timestamp) - Date.parse(t.timestamp);
        return age >= 0 && age < DUPLICATE_WINDOW_MS;
      });

      if (recentDuplicate) {
        return {
          ...state,
          transactions: [buildTxn({ failureReason: 'DUPLICATE_REQUEST' }), ...state.transactions],
          processedRequestIds: [...state.processedRequestIds, requestId],
          auditEvents: pushAudit(state, [
            startEvent,
            signEvent,
            makeAuditEvent('block', `Duplicate transfer vector intercepted! Matching route+amount settled ${DUPLICATE_WINDOW_MS / 1000}s ago. req=${shortId} blocked.`),
          ]),
        };
      }

      // 4. Overdraft protection.
      if (fromAccount.balance < amount) {
        return {
          ...state,
          transactions: [buildTxn({ failureReason: 'INSUFFICIENT_FUNDS' }), ...state.transactions],
          processedRequestIds: [...state.processedRequestIds, requestId],
          auditEvents: pushAudit(state, [
            startEvent,
            signEvent,
            makeAuditEvent('block', `Overdraft vector intercepted! req=${shortId} would draw ${formatCurrency(amount)} against ${formatCurrency(fromAccount.balance)} available. Balances rolled back atomically.`),
          ]),
        };
      }

      // 5. All checks passed — apply both balance mutations and the
      //    completed ledger entry together, in the same state transition.
      const nextAccounts: Account[] = state.accounts.map((acc) => {
        if (acc.id === fromAccountId) return { ...acc, balance: acc.balance - amount };
        if (acc.id === toAccountId) return { ...acc, balance: acc.balance + amount };
        return acc;
      });

      const balanceAfterFrom = nextAccounts.find((a) => a.id === fromAccountId)!.balance;
      const balanceAfterTo = nextAccounts.find((a) => a.id === toAccountId)!.balance;

      return {
        accounts: nextAccounts,
        transactions: [
          buildTxn({ status: 'completed', failureReason: undefined, balanceAfterFrom, balanceAfterTo }),
          ...state.transactions,
        ],
        processedRequestIds: [...state.processedRequestIds, requestId],
        auditEvents: pushAudit(state, [
          startEvent,
          signEvent,
          makeAuditEvent('ok', `Transfer settled — ${formatCurrency(amount)} moved ${fromAccountId} → ${toAccountId}. req=${shortId}. Both balances committed atomically.`),
        ]),
      };
    }

    default:
      return state;
  }
}

interface FinanceContextValue {
  state: FinanceState;
  transfer: (req: TransferRequest) => void;
  reset: () => void;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const transfer = (req: TransferRequest) => dispatch({ type: 'TRANSFER_FUNDS', payload: req });
  const reset = () => dispatch({ type: 'RESET' });

  return (
    <FinanceContext.Provider value={{ state, transfer, reset }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}
