import type { Account, Person } from '../types';

export const seedAccounts: Account[] = [
  { id: 'acc_checking', name: 'Everyday Checking', owner: 'Kanishk Sharma', balance: 5000000, currency: 'INR' }, // ₹50,000.00
  { id: 'acc_savings', name: 'Primary Savings', owner: 'Kanishk Sharma', balance: 12500000, currency: 'INR' }, // ₹1,25,000.00
  { id: 'acc_wallet', name: 'Travel Wallet', owner: 'Kanishk Sharma', balance: 800000, currency: 'INR' }, // ₹8,000.00
];

// People available to add to bill-splitting groups — these are friends,
// not bank accounts, so they're kept as a separate list.
export const seedPeople: Person[] = [
  { id: 'per_kanishk', name: 'Kanishk' },
  { id: 'per_peehu', name: 'Peehu' },
  { id: 'per_ritvik', name: 'Ritvik' },
  { id: 'per_rohit', name: 'Rohit' },
  
];