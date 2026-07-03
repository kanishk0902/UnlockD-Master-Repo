import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { Account, AuditEvent, AuditLevel, FinanceState, Transaction, TransferRequest } from '../types';
import { seedAccounts } from '../data/seed';
import { generateId } from '../utils/id';
import { formatCurrency } from '../utils/money';

const MAX_AUDIT_EVENTS = 200;
const STORAGE_KEY = 'unlockd_finance_state_v1';
const DUPLICATE_WINDOW_MS = 5000;

type Action =
  | { type: 'TRANSFER_FUNDS'; payload: TransferRequest }
  | { type: 'UPDATE_BUDGET'; payload: { category: string; amount: number } }
  | { type: 'RESET_BUDGETS' }
  | { type: 'ADD_BUDGET'; payload: { category: string; limit: number } }
  | { type: 'DELETE_BUDGET'; payload: { id: string } }
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
    budgets: [], 
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

function financeReducer(state: FinanceState, action: Action): FinanceState {
  switch (action.type) {
    case 'RESET':
      return {
        accounts: seedAccounts,
        transactions: [],
        processedRequestIds: [],
        auditEvents: [],
        budgets: [],
      };

    case 'ADD_BUDGET': {
      const { category, limit } = action.payload;
      return {
        ...state,
        budgets: [
          ...state.budgets,
          { 
            id: generateId('bgt'), 
            category, 
            limit, 
            spent: 0, 
            lastResetDate: new Date().toISOString() 
          }
        ]
      };
    }

    case 'DELETE_BUDGET': {
      return {
        ...state,
        budgets: state.budgets.filter(b => b.id !== action.payload.id)
      };
    }

    case 'UPDATE_BUDGET': {
      const { category, amount } = action.payload;
      return {
        ...state,
        budgets: state.budgets.map(b => 
          b.category === category ? { ...b, spent: b.spent + amount } : b
        )
      };
    }

    case 'RESET_BUDGETS': {
      return {
        ...state,
        budgets: state.budgets.map(b => ({ 
          ...b, 
          spent: 0, 
          lastResetDate: new Date().toISOString() 
        }))
      };
    }

    case 'TRANSFER_FUNDS': {
      const { requestId, fromAccountId, toAccountId, amount, note, requestHash, category } = action.payload;
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

      if (state.processedRequestIds.includes(requestId)) {
        return {
          ...state,
          auditEvents: pushAudit(state, [
            startEvent,
            makeAuditEvent('block', `Duplicate idempotency key replay detected — req=${shortId} already settled. Attempt discarded, no state change.`),
          ]),
        };
      }

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
          auditEvents: pushAudit(state, [startEvent, makeAuditEvent('error', `Amount validation failed for req=${shortId}. Non-positive or non-integer value.`)]),
        };
      }

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

      const nextAccounts: Account[] = state.accounts.map((acc) => {
        if (acc.id === fromAccountId) return { ...acc, balance: acc.balance - amount };
        if (acc.id === toAccountId) return { ...acc, balance: acc.balance + amount };
        return acc;
      });

      const balanceAfterFrom = nextAccounts.find((a) => a.id === fromAccountId)!.balance;
      const balanceAfterTo = nextAccounts.find((a) => a.id === toAccountId)!.balance;

      const nextBudgets = state.budgets.map(b => 
        (category && category.toLowerCase() === b.category.toLowerCase())
          ? { ...b, spent: b.spent + amount }
          : b
      );

      return {
        accounts: nextAccounts,
        transactions: [
          buildTxn({ status: 'completed', failureReason: undefined, balanceAfterFrom, balanceAfterTo, category }),
          ...state.transactions,
        ],
        processedRequestIds: [...state.processedRequestIds, requestId],
        auditEvents: pushAudit(state, [
          startEvent,
          signEvent,
          makeAuditEvent('ok', `Transfer settled — ${formatCurrency(amount)} moved ${fromAccountId} → ${toAccountId}. req=${shortId}. Both balances committed atomically.`),
        ]),
        budgets: nextBudgets,
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
  updateBudget: (category: string, amount: number) => void;
  resetBudgets: () => void;
  addBudget: (category: string, limit: number) => void;
  deleteBudget: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const transfer = (req: TransferRequest) => dispatch({ type: 'TRANSFER_FUNDS', payload: req });
  const reset = () => dispatch({ type: 'RESET' });
  const updateBudget = (category: string, amount: number) => {
    dispatch({ type: 'UPDATE_BUDGET', payload: { category, amount } });
  };
  const resetBudgets = () => dispatch({ type: 'RESET_BUDGETS' });
  const addBudget = (category: string, limit: number) => {
    dispatch({ type: 'ADD_BUDGET', payload: { category, limit } });
  };
  const deleteBudget = (id: string) => {
    dispatch({ type: 'DELETE_BUDGET', payload: { id } });
  };

  return (
    <FinanceContext.Provider value={{ state, transfer, reset, updateBudget, resetBudgets, addBudget, deleteBudget }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}