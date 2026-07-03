import type { Account } from '../types';

export const seedAccounts: Account[] = [
  { id: 'acc_checking', name: 'Everyday Checking', owner: 'Kanishk Sharma', balance: 5000000, currency: 'INR' }, // ₹50,000.00
  { id: 'acc_savings', name: 'Primary Savings', owner: 'Kanishk Sharma', balance: 12500000, currency: 'INR' }, // ₹1,25,000.00
  { id: 'acc_wallet', name: 'Travel Wallet', owner: 'Kanishk Sharma', balance: 800000, currency: 'INR' }, // ₹8,000.00
];
