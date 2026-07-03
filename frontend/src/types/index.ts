export type TransactionStatus = 'completed' | 'failed' | 'reversed';

export type FailureReason =
  | 'INSUFFICIENT_FUNDS'
  | 'DUPLICATE_REQUEST'
  | 'SAME_ACCOUNT'
  | 'INVALID_AMOUNT'
  | 'ACCOUNT_NOT_FOUND';

  // Add these to your Action type union
export type Action = 
  | { type: 'RESET' }
  | { type: 'TRANSFER_FUNDS'; payload: TransferRequest }
  | { type: 'UPDATE_BUDGET'; payload: { category: string; amount: number } }
  | { type: 'RESET_BUDGETS' }; // Add this line!

export interface Account {
  id: string;
  name: string;
  owner: string;
  balance: number; // stored in smallest currency unit-safe number (paise-safe via integer cents)
  currency: string;
}

export interface Transaction {
  id: string;
  requestId: string; // idempotency key supplied by the client at submit time
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  status: TransactionStatus;
  failureReason?: FailureReason;
  note?: string;
  timestamp: string; // ISO string
  category?: string; 
  balanceAfterFrom?: number;
  balanceAfterTo?: number;
  
}

export interface TransferRequest {
  requestId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  category?: string; //
  /** Real SHA-256 hex digest of the request payload, computed client-side
   *  via the Web Crypto API before dispatch. Used only for audit-log
   *  display — the actual idempotency guard runs on requestId. */
  requestHash?: string;
}

export type AuditLevel = 'info' | 'sign' | 'block' | 'ok' | 'error';

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO string
  level: AuditLevel;
  message: string;
}

export interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  processedRequestIds: string[]; // guards against duplicate/replayed submissions
  auditEvents: AuditEvent[]; // append-only stream of every attempt, incl. suppressed replays
  budgets: Budget[];
  groups: SplitGroup[];
  people: Person[];
}

// A person who can be added to a bill-splitting group. Deliberately separate
// from Account: accounts are Kanishk's own checking/savings/wallet buckets,
// whereas group members are the actual friends splitting a bill with him.
export interface Person {
  id: string;
  name: string;
}
export interface Budget {
  id: string;
  category: string; // e.g., 'Food', 'Travel', 'Shopping'
  limit: number;
  spent: number;
  lastResetDate: string; // ISO date string
}
export type SplitType =
  | 'EQUAL'
  | 'CUSTOM'
  | 'PERCENTAGE'
  | 'SHARES';

export interface Split {
    memberId: string;
    amount: number;
    percentage?: number;
    shares?: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidById: string;
  date: string;
  splitType: SplitType;
  splits: Split[];
}

export interface Settlement {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  status: 'PENDING'
| 'COMPLETED'
| 'CANCELLED'
createdAt: string; // ISO timestamp — when this debt first appeared between this pair
  interestRate: number; // e.g. 0.10 for 10%
  interestGraceDays: number; // e.g. 2 — days allowed before interest kicks in
  interestApplied?: boolean; 
}

export interface SplitGroup {
  id: string;
  name: string;
  members: string[]; // Array of Account IDs
  expenses: GroupExpense[];
  settlements: Settlement[]; // The auto-calculated optimized repayment paths
}