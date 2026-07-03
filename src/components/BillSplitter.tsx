import React, { useState } from 'react';
import { useFinance, getEffectiveSettlement, SETTLEMENT_INTEREST_RATE, SETTLEMENT_GRACE_DAYS } from '../context/FinanceContext';
import { formatCurrency } from '../utils/money';
import type { SplitType } from '../types';

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'EQUAL', label: 'Split Equally' },
  { value: 'PERCENTAGE', label: 'By Percentage' },
  { value: 'SHARES', label: 'By Shares' },
  { value: 'CUSTOM', label: 'Custom Amounts' },
];

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'overdue';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  return `${hours}h left`;
}

export function BillSplitter() {
  const { state, createGroup, addGroupExpense, markSettled, ageSettlements } = useFinance();

  // Group Creation State
  const [groupName, setGroupName] = useState('');

  // Expense State
  const [desc, setDesc] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paidById, setPaidById] = useState(state.people[0]?.id || '');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  // Per-member raw input values, keyed by memberId — meaning depends on splitType
  // (percentage points, share counts, or absolute rupee amounts).
  const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const memberIds = state.people.map(p => p.id);
    createGroup(groupName, memberIds);
    setGroupName('');
  };

  const buildSplits = (
    totalAmount: number,
    members: string[],
    type: SplitType
  ): { memberId: string; amount: number }[] | null => {
    if (type === 'EQUAL') {
      const share = totalAmount / members.length;
      return members.map(memberId => ({ memberId, amount: share }));
    }

    if (type === 'PERCENTAGE') {
      const pcts = members.map(m => parseFloat(memberInputs[m] || '0'));
      const totalPct = pcts.reduce((a, b) => a + b, 0);
      if (Math.abs(totalPct - 100) > 0.5) return null; // must add up to ~100%
      return members.map((memberId, i) => ({ memberId, amount: (totalAmount * pcts[i]) / 100 }));
    }

    if (type === 'SHARES') {
      const shares = members.map(m => parseFloat(memberInputs[m] || '0'));
      const totalShares = shares.reduce((a, b) => a + b, 0);
      if (totalShares <= 0) return null;
      return members.map((memberId, i) => ({ memberId, amount: (totalAmount * shares[i]) / totalShares }));
    }

    // CUSTOM: raw rupee amounts per member, must sum to the total
    const amounts = members.map(m => parseFloat(memberInputs[m] || '0'));
    const totalCustom = amounts.reduce((a, b) => a + b, 0);
    if (Math.abs(totalCustom - totalAmount) > 0.5) return null;
    return members.map((memberId, i) => ({ memberId, amount: amounts[i] }));
  };

  const handleAddExpense = (e: React.FormEvent, groupId: string, members: string[]) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0 || !desc.trim() || !paidById) return;

    const splits = buildSplits(amount, members, splitType);
    if (!splits) {
      alert(
        splitType === 'PERCENTAGE'
          ? 'Percentages must add up to 100%.'
          : splitType === 'SHARES'
          ? 'Enter at least one share.'
          : 'Custom amounts must add up to the total bill.'
      );
      return;
    }

    addGroupExpense(groupId, desc, amount, paidById, splits, splitType);
    setDesc('');
    setAmountInput('');
    setMemberInputs({});
  };

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>Group Bill Splitting</h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {SETTLEMENT_INTEREST_RATE * 100}% late fee after {SETTLEMENT_GRACE_DAYS} days unpaid
        </span>
      </div>

      {state.groups.length === 0 ? (
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="New Group Name (e.g. Goa Trip)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
          />
          <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Create Group
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {state.groups.map(group => (
            <div key={group.id} style={{ border: '1px solid #334155', borderRadius: '8px', padding: '16px', backgroundColor: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: '0', color: '#f8fafc', fontSize: '16px' }}>{group.name}</h4>
                {group.settlements.some(s => s.status === 'PENDING') && (
                  <button
                    onClick={() => ageSettlements(group.id, 3)}
                    title="Demo only: backdates pending settlements by 3 days to show the late-interest rule live"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#f2a65a',
                      border: '1px solid #f2a65a',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    ⏩ Fast-forward 3 days (demo)
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h5 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Add Group Expense</h5>
                  <form onSubmit={(e) => handleAddExpense(e, group.id, group.members)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="What was it for? (e.g. Dinner)"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
                      />
                      <select
                        value={paidById}
                        onChange={(e) => setPaidById(e.target.value)}
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
                      >
                        {group.members.map(memberId => {
                          const acc = state.accounts.find(a => a.id === memberId);
                          return <option key={memberId} value={memberId}>{acc?.name || memberId}</option>;
                        })}
                      </select>
                    </div>

                    <select
                      value={splitType}
                      onChange={(e) => { setSplitType(e.target.value as SplitType); setMemberInputs({}); }}
                      style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
                    >
                      {SPLIT_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                    </select>

                    {splitType !== 'EQUAL' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#0b0f19', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                        {group.members.map(memberId => {
                          const acc = state.accounts.find(a => a.id === memberId);
                          const placeholder =
                            splitType === 'PERCENTAGE' ? '%' : splitType === 'SHARES' ? 'shares' : '₹';
                          return (
                            <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1' }}>{acc?.name || memberId}</span>
                              <input
                                type="number"
                                placeholder={placeholder}
                                value={memberInputs[memberId] || ''}
                                onChange={(e) => setMemberInputs(prev => ({ ...prev, [memberId]: e.target.value }))}
                                style={{ width: '90px', padding: '6px', borderRadius: '4px', backgroundColor: '#111827', border: '1px solid #334155', color: 'white' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button type="submit" style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#10b981', color: '#0b0f19', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      Add Expense
                    </button>
                  </form>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Optimized Settlements</h5>
                  {group.settlements.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Everyone is settled up!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {group.settlements.map(settlement => {
                        const fromAcc = state.accounts.find(a => a.id === settlement.fromId);
                        const toAcc = state.accounts.find(a => a.id === settlement.toId);
                        const isCompleted = settlement.status === 'COMPLETED';
                        const { amount: effectiveAmount, isOverdue, interestAmount } = getEffectiveSettlement(settlement);
                        const dueInMs = SETTLEMENT_GRACE_DAYS * 24 * 60 * 60 * 1000 - (Date.now() - Date.parse(settlement.createdAt));

                        return (
                          <div
                            key={settlement.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#0b0f19',
                              padding: '12px',
                              borderRadius: '6px',
                              border: `1px solid ${isCompleted ? '#10b981' : isOverdue ? '#ef4444' : '#334155'}`,
                            }}
                          >
                            <div style={{ fontSize: '13px', color: isCompleted ? '#64748b' : '#f8fafc', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              <strong>{fromAcc?.name}</strong> owes <strong>{toAcc?.name}</strong>
                              <div style={{ color: isCompleted ? '#10b981' : '#ef4444', fontWeight: 'bold', marginTop: '4px' }}>
                                {formatCurrency(effectiveAmount)}
                                {interestAmount > 0 && !isCompleted && (
                                  <span style={{ color: '#f2a65a', fontWeight: 'normal', marginLeft: '6px' }}>
                                    (+{formatCurrency(interestAmount)} late fee)
                                  </span>
                                )}
                                {isCompleted && settlement.interestApplied && (
                                  <span style={{ color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                    (incl. late fee)
                                  </span>
                                )}
                              </div>
                              {!isCompleted && (
                                <div style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : '#64748b', marginTop: '2px' }}>
                                  {isOverdue ? `${SETTLEMENT_INTEREST_RATE * 100}% interest now applies` : formatTimeRemaining(dueInMs)}
                                </div>
                              )}
                            </div>
                            {!isCompleted && (
                              <button
                                onClick={() => markSettled(group.id, settlement.id)}
                                style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                              >
                                Settle
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}