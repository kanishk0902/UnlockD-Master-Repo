import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { Account, AuditEvent, AuditLevel, FinanceState, Transaction, TransferRequest, SplitGroup, GroupExpense, Settlement, SplitType } from '../types';

import { generateId } from '../utils/id';
import { formatCurrency } from '../utils/money';
import { seedAccounts, seedPeople } from '../data/seed';

const MAX_AUDIT_EVENTS = 200;
const STORAGE_KEY = 'unlockd_finance_state_v1';
const DUPLICATE_WINDOW_MS = 5000;

// Late-settlement interest: if a debt between two people sits PENDING for
// longer than the grace period, the creditor is entitled to a one-time 10%
// penalty on top of what's owed.
export const SETTLEMENT_INTEREST_RATE = 0.10;
export const SETTLEMENT_GRACE_DAYS = 2;
const GRACE_MS = SETTLEMENT_GRACE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Returns the amount actually owed on a settlement right now, including any
 * accrued late interest. This is a pure read-time calculation — nothing is
 * mutated — so the UI always shows a live, correct number without needing a
 * background timer or periodic dispatch.
 */
export function getEffectiveSettlement(settlement: Settlement): {
  amount: number;
  isOverdue: boolean;
  interestAmount: number;
} {
  if (settlement.status !== 'PENDING') {
    return { amount: settlement.amount, isOverdue: false, interestAmount: 0 };
  }
  const age = Date.now() - Date.parse(settlement.createdAt);
  const isOverdue = age > GRACE_MS;
  const interestAmount = isOverdue ? Math.round(settlement.amount * settlement.interestRate) : 0;
  return { amount: settlement.amount + interestAmount, isOverdue, interestAmount };
}

type Action =
  | { type: 'TRANSFER_FUNDS'; payload: TransferRequest }
  | { type: 'UPDATE_BUDGET'; payload: { category: string; amount: number } }
  | { type: 'RESET_BUDGETS' }
  | { type: 'ADD_BUDGET'; payload: { category: string; limit: number } }
  | { type: 'DELETE_BUDGET'; payload: { id: string } }
  | { type: 'CREATE_GROUP'; payload: { name: string; members: string[] } }
  | { type: 'ADD_GROUP_EXPENSE'; payload: { groupId: string; description: string; amount: number; paidById: string; splits: { memberId: string; amount: number }[]; splitType?: SplitType } }
  | { type: 'MARK_SETTLED'; payload: { groupId: string; settlementId: string } }
  | { type: 'AGE_SETTLEMENTS'; payload: { groupId: string; days: number } }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; category?: string; note?: string; merchant?: string } }
  | { type: 'RESET' };

function loadInitialState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceState;
      if (parsed.accounts?.length) {
        return {
          ...parsed,
          groups: parsed.groups || [],
          people: parsed.people?.length ? parsed.people : seedPeople,
        };
      }
    }
  } catch {}
  return {
    accounts: seedAccounts,
    transactions: [],
    processedRequestIds: [],
    auditEvents: [],
    budgets: [],
    groups: [],
    people: seedPeople,
  };
}

function optimizeSettlements(groupId: string, expenses: GroupExpense[], previousSettlements: Settlement[]): Settlement[] {
  const balances: Record<string, number> = {};

  expenses.forEach(exp => {
    balances[exp.paidById] = (balances[exp.paidById] || 0) + exp.amount;
    exp.splits.forEach(split => {
      balances[split.memberId] = (balances[split.memberId] || 0) - split.amount;
    });
  });

  const debtors = Object.keys(balances).filter(id => balances[id] <= -0.01).map(id => ({ id, amount: Math.abs(balances[id]) })).sort((a, b) => b.amount - a.amount);
  const creditors = Object.keys(balances).filter(id => balances[id] >= 0.01).map(id => ({ id, amount: balances[id] })).sort((a, b) => b.amount - a.amount);

  // Debts between the same two people should keep accruing toward the same
  // due date across expense additions, rather than resetting the interest
  // clock every time someone adds a new group expense. We key on the
  // unordered pair so it survives even if who-owes-whom flips.
  const priorCreatedAt: Record<string, string> = {};
  previousSettlements.forEach(s => {
    if (s.status !== 'PENDING') return;
    const key = [s.fromId, s.toId].sort().join('|');
    const existing = priorCreatedAt[key];
    if (!existing || Date.parse(s.createdAt) < Date.parse(existing)) {
      priorCreatedAt[key] = s.createdAt;
    }
  });

  const now = new Date().toISOString();
  const settlements: Settlement[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    const pairKey = [debtor.id, creditor.id].sort().join('|');

    settlements.push({
      id: generateId('stl'),
      groupId,
      fromId: debtor.id,
      toId: creditor.id,
      amount,
      status: 'PENDING',
      createdAt: priorCreatedAt[pairKey] || now,
      interestRate: SETTLEMENT_INTEREST_RATE,
      interestGraceDays: SETTLEMENT_GRACE_DAYS,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
}

function financeReducer(state: FinanceState, action: Action): FinanceState {
  switch (action.type) {
    case 'RESET':
      return { accounts: seedAccounts, transactions: [], processedRequestIds: [], auditEvents: [], budgets: [], groups: [], people: seedPeople };

    case 'ADD_BUDGET':
      return { ...state, budgets: [...state.budgets, { id: generateId('bgt'), category: action.payload.category, limit: action.payload.limit, spent: 0, lastResetDate: new Date().toISOString() }] };

    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload.id) };

    case 'UPDATE_BUDGET':
      return { ...state, budgets: state.budgets.map(b => b.category === action.payload.category ? { ...b, spent: b.spent + action.payload.amount } : b) };

    case 'RESET_BUDGETS':
      return { ...state, budgets: state.budgets.map(b => ({ ...b, spent: 0, lastResetDate: new Date().toISOString() })) };

    case 'CREATE_GROUP': {
      return {
        ...state,
        groups: [...state.groups, {
          id: generateId('grp'),
          name: action.payload.name,
          members: action.payload.members,
          expenses: [],
          settlements: []
        }]
      };
    }

    case 'ADD_GROUP_EXPENSE': {
      const { groupId, description, amount, paidById, splits, splitType } = action.payload;

      const newExpense: GroupExpense = {
        id: generateId('exp'),
        groupId,
        description,
        amount,
        paidById,
        date: new Date().toISOString(),
        splitType: splitType ?? 'CUSTOM',
        splits
      };

      const updatedGroups = state.groups.map(g => {
        if (g.id !== groupId) return g;
        const updatedExpenses = [...g.expenses, newExpense];
        const optimizedSettlements = optimizeSettlements(groupId, updatedExpenses, g.settlements);
        return { ...g, expenses: updatedExpenses, settlements: optimizedSettlements };
      });

      return { ...state, groups: updatedGroups };
    }

    case 'MARK_SETTLED': {
      const { groupId, settlementId } = action.payload;
      const updatedGroups = state.groups.map(g => {
        if (g.id !== groupId) return g;
        const updatedSettlements = g.settlements.map(s => {
          if (s.id !== settlementId) return s;
          const { amount, interestAmount } = getEffectiveSettlement(s);
          return { ...s, amount, status: 'COMPLETED' as const, interestApplied: interestAmount > 0 };
        });
        return { ...g, settlements: updatedSettlements };
      });
      return { ...state, groups: updatedGroups };
    }

    case 'AGE_SETTLEMENTS': {
      // Demo-only: pushes every PENDING settlement's createdAt back in time
      // so the 10% late-interest rule can be shown live without waiting for
      // real days to pass. Nothing else about the settlement changes —
      // getEffectiveSettlement() picks up the new age automatically.
      const { groupId, days } = action.payload;
      const shiftMs = days * 24 * 60 * 60 * 1000;
      const updatedGroups = state.groups.map(g => {
        if (g.id !== groupId) return g;
        const updatedSettlements = g.settlements.map(s => {
          if (s.status !== 'PENDING') return s;
          return { ...s, createdAt: new Date(Date.parse(s.createdAt) - shiftMs).toISOString() };
        });
        return { ...g, settlements: updatedSettlements };
      });
      return { ...state, groups: updatedGroups };
    }

    case 'UPDATE_TRANSACTION': {
      const { id, category, note, merchant } = action.payload;
      const existing = state.transactions.find(t => t.id === id);
      if (!existing) return state;

      const oldCategory = existing.category;
      const nextCategory = category !== undefined ? category : oldCategory;

      // Keep budget "spent" totals honest when a transaction is recategorized:
      // remove the amount from the old category's budget and add it to the new one.
      let nextBudgets = state.budgets;
      if (category !== undefined && category !== oldCategory) {
        nextBudgets = state.budgets.map(b => {
          if (oldCategory && b.category.toLowerCase() === oldCategory.toLowerCase()) {
            return { ...b, spent: Math.max(0, b.spent - existing.amount) };
          }
          if (nextCategory && b.category.toLowerCase() === nextCategory.toLowerCase()) {
            return { ...b, spent: b.spent + existing.amount };
          }
          return b;
        });
      }

      const nextTransactions = state.transactions.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          category: category !== undefined ? category : t.category,
          note: note !== undefined ? note : t.note,
          merchant: merchant !== undefined ? merchant : t.merchant,
          edited: true,
        };
      });

      return { ...state, transactions: nextTransactions, budgets: nextBudgets };
    }

    case 'TRANSFER_FUNDS': {
      const { requestId, fromAccountId, toAccountId, amount, note, requestHash, category } = action.payload;
      const timestamp = new Date().toISOString();
      if (state.processedRequestIds.includes(requestId)) return state;

      const fromAccount = state.accounts.find((a) => a.id === fromAccountId);
      const toAccount = state.accounts.find((a) => a.id === toAccountId);

      if (!fromAccount || !toAccount || fromAccountId === toAccountId || amount <= 0 || fromAccount.balance < amount) return state;

      const nextAccounts: Account[] = state.accounts.map((acc) => {
        if (acc.id === fromAccountId) return { ...acc, balance: acc.balance - amount };
        if (acc.id === toAccountId) return { ...acc, balance: acc.balance + amount };
        return acc;
      });

      const nextBudgets = state.budgets.map(b =>
        (category && category.toLowerCase() === b.category.toLowerCase()) ? { ...b, spent: b.spent + amount } : b
      );

      return {
        ...state,
        accounts: nextAccounts,
        transactions: [
          { id: generateId('txn'), requestId, fromAccountId, toAccountId, amount, status: 'completed', timestamp, note, category, balanceAfterFrom: nextAccounts.find(a => a.id === fromAccountId)!.balance, balanceAfterTo: nextAccounts.find(a => a.id === toAccountId)!.balance },
          ...state.transactions,
        ],
        processedRequestIds: [...state.processedRequestIds, requestId],
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
  createGroup: (name: string, members: string[]) => void;
  addGroupExpense: (groupId: string, description: string, amount: number, paidById: string, splits: { memberId: string; amount: number }[], splitType?: SplitType) => void;
  markSettled: (groupId: string, settlementId: string) => void;
  ageSettlements: (groupId: string, days: number) => void;
  updateTransaction: (id: string, updates: { category?: string; note?: string; merchant?: string }) => void;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, loadInitialState);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const transfer = (req: TransferRequest) => dispatch({ type: 'TRANSFER_FUNDS', payload: req });
  const reset = () => dispatch({ type: 'RESET' });
  const updateBudget = (cat: string, amt: number) => dispatch({ type: 'UPDATE_BUDGET', payload: { category: cat, amount: amt } });
  const resetBudgets = () => dispatch({ type: 'RESET_BUDGETS' });
  const addBudget = (cat: string, limit: number) => dispatch({ type: 'ADD_BUDGET', payload: { category: cat, limit } });
  const deleteBudget = (id: string) => dispatch({ type: 'DELETE_BUDGET', payload: { id } });
  const createGroup = (name: string, members: string[]) => dispatch({ type: 'CREATE_GROUP', payload: { name, members } });
  const addGroupExpense = (groupId: string, description: string, amount: number, paidById: string, splits: { memberId: string; amount: number }[], splitType?: SplitType) => dispatch({ type: 'ADD_GROUP_EXPENSE', payload: { groupId, description, amount, paidById, splits, splitType } });
  const markSettled = (groupId: string, settlementId: string) => dispatch({ type: 'MARK_SETTLED', payload: { groupId, settlementId } });
  const ageSettlements = (groupId: string, days: number) => dispatch({ type: 'AGE_SETTLEMENTS', payload: { groupId, days } });
  const updateTransaction = (id: string, updates: { category?: string; note?: string; merchant?: string }) => dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, ...updates } });

  return (
    <FinanceContext.Provider value={{ state, transfer, reset, updateBudget, resetBudgets, addBudget, deleteBudget, createGroup, addGroupExpense, markSettled, ageSettlements, updateTransaction }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}