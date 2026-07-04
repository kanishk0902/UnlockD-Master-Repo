import React, { useState } from 'react';
import { useFinance, getEffectiveSettlement } from '../context/FinanceContext';
import { formatCurrency } from '../utils/money';
import { useLanguage } from "../context/LanguageContext";   // ← Added
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

function getCleanName(rawId: string, accountName?: string): string {
  const nameToProcess = accountName || rawId || 'Unknown';
  if (nameToProcess.toLowerCase().includes('kanishk') || nameToProcess.toLowerCase().includes('you')) return 'You';
  const clean = nameToProcess.replace('per_', '').replace('acc_', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function GroupCard({ group, state, addGroupExpense, markSettled, ageSettlements }: any) {
  const { translate } = useLanguage();   // ← Added

  const [desc, setDesc] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paidById, setPaidById] = useState('per_kanishk');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});
  const [category, setCategory] = useState('General');

  const autoCategorize = (description: string) => {
    const lower = description.toLowerCase();
    if (lower.includes('uber') || lower.includes('flight') || lower.includes('train') || lower.includes('cab')) return 'Travel';
    if (lower.includes('zomato') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('barbeque') || lower.includes('food')) return 'Food & Dining';
    if (lower.includes('hotel') || lower.includes('airbnb') || lower.includes('stay')) return 'Accommodation';
    if (lower.includes('movie') || lower.includes('concert') || lower.includes('netflix')) return 'Entertainment';
    return 'General';
  };

  const buildSplits = (totalAmount: number, members: string[], type: SplitType): { memberId: string; amount: number }[] | null => {
    if (type === 'EQUAL') {
      const share = totalAmount / members.length;
      return members.map(memberId => ({ memberId, amount: share }));
    }
    if (type === 'PERCENTAGE') {
      const pcts = members.map(m => parseFloat(memberInputs[m] || '0'));
      const totalPct = pcts.reduce((a, b) => a + b, 0);
      if (Math.abs(totalPct - 100) > 0.5) return null;
      return members.map((memberId, i) => ({ memberId, amount: (totalAmount * pcts[i]) / 100 }));
    }
    if (type === 'SHARES') {
      const shares = members.map(m => parseFloat(memberInputs[m] || '0'));
      const totalShares = shares.reduce((a, b) => a + b, 0);
      if (totalShares <= 0) return null;
      return members.map((memberId, i) => ({ memberId, amount: (totalAmount * shares[i]) / totalShares }));
    }
    const amounts = members.map(m => parseFloat(memberInputs[m] || '0'));
    const totalCustom = amounts.reduce((a, b) => a + b, 0);
    if (Math.abs(totalCustom - totalAmount) > 0.5) return null;
    return members.map((memberId, i) => ({ memberId, amount: amounts[i] }));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0 || !desc.trim() || !paidById) return;

    const splits = buildSplits(amount, group.members, splitType);
    if (!splits) {
      alert("Please check your split math. It does not add up to the total.");
      return;
    }

    addGroupExpense(group.id, desc, amount, paidById, splits, splitType);
    setDesc('');
    setAmountInput('');
    setMemberInputs({});
    setCategory('General');
  };

  return (
    <div style={{ border: '1px solid #334155', borderRadius: '8px', padding: '16px', backgroundColor: '#0f172a' }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '16px' }}>{group.name}</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <h5 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
            {translate("addGroupExpense")}
          </h5>
          
          <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={translate("whatWasItFor")}
                value={desc}
                onChange={(e) => {
                  const text = e.target.value;
                  setDesc(text);
                  setCategory(autoCategorize(text));
                }}
                style={{ width: '100%', padding: '10px', paddingRight: '100px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white', boxSizing: 'border-box' }}
              />
              {desc && (
                <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 'bold' }}>
                  ✨ AI: {category}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="number"
                placeholder={translate("amount")}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
              />
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
              >
                {group.members.map((memberId: string) => {
                  const acc = state.accounts?.find((a: any) => a.id === memberId);
                  return <option key={memberId} value={memberId}>{getCleanName(memberId, acc?.name)} paid</option>;
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#0b0f19', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px 0' }}>
                  {splitType === 'PERCENTAGE' ? 'Enter percentages (must total 100%)' :
                   splitType === 'SHARES' ? 'Enter shares (e.g., 1, 2, 1)' :
                   'Enter exact amounts (₹)'}
                </p>
                {group.members.map((memberId: string) => {
                  const acc = state.accounts?.find((a: any) => a.id === memberId);
                  return (
                    <div key={memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#f8fafc', fontSize: '13px' }}>{getCleanName(memberId, acc?.name)}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={memberInputs[memberId] || ''}
                        onChange={(e) => setMemberInputs({ ...memberInputs, [memberId]: e.target.value })}
                        style={{ width: '80px', padding: '6px', borderRadius: '4px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', textAlign: 'right' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <button type="submit" style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#10b981', color: '#0b0f19', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              {translate("addExpense")}
            </button>
          </form>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h5 style={{ margin: 0, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
              {translate("optimizedSettlements")}
            </h5>
            <button
              onClick={() => ageSettlements(group.id, 3)}
              style={{ fontSize: '10px', padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              title="Simulate 3 days passing"
            >
              ⏱️ {translate("devFastForward")}
            </button>
          </div>

          {group.settlements.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Everyone is settled up!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.settlements.filter((s: any) => s.status === 'PENDING').map((settlement: any) => {
                const { amount, isOverdue, interestAmount } = getEffectiveSettlement(settlement);
                const fromAcc = state.accounts?.find((a: any) => a.id === settlement.fromId);
                const toAcc = state.accounts?.find((a: any) => a.id === settlement.toId);
                const fromName = getCleanName(settlement.fromId, fromAcc?.name);
                const toName = getCleanName(settlement.toId, toAcc?.name);

                return (
                  <div key={settlement.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#0b0f19',
                    padding: '12px',
                    borderRadius: '6px',
                    border: isOverdue ? '1px solid #ef4444' : '1px solid #1e293b'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#f8fafc', marginBottom: '4px' }}>
                        <strong>{fromName}</strong> {translate("owesYou")} {toName}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: isOverdue ? '#ef4444' : '#f8fafc' }}>
                        {formatCurrency(amount)}
                        {isOverdue && (
                          <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '8px', fontWeight: 'normal' }}>
                            (+₹{interestAmount} {translate("lateFee")})
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => markSettled(group.id, settlement.id)}
                      style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      {translate("settle")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BillSplitter() {
  const { state, createGroup, addGroupExpense, markSettled, ageSettlements } = useFinance();
  const { translate } = useLanguage();   // ← Added

  const [groupName, setGroupName] = useState('');
  const [customMembers, setCustomMembers] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const memberArray = customMembers
      .split(',')
      .map(m => m.trim())
      .filter(Boolean)
      .map(m => `per_${m.toLowerCase()}`);
    const finalMembers = ['per_kanishk', ...memberArray];
    const memberIds = finalMembers.length > 1 ? finalMembers : state.people.map(p => p.id);
    createGroup(groupName, memberIds);
    setGroupName('');
    setCustomMembers('');
  };

  return (
    <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>{translate("groupBillSplitting")}</h3>
      </div>
      <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <input
          type="text"
          placeholder={translate("groupNamePlaceholder")}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
        />
        <input
          type="text"
          placeholder={translate("addMembersPlaceholder")}
          value={customMembers}
          onChange={(e) => setCustomMembers(e.target.value)}
          style={{ flex: 2, padding: '10px', borderRadius: '6px', backgroundColor: '#0b0f19', border: '1px solid #334155', color: 'white' }}
        />
        <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {translate("createGroup")}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {state.groups.map((group: any) => (
          <GroupCard
            key={group.id}
            group={group}
            state={state}
            addGroupExpense={addGroupExpense}
            markSettled={markSettled}
            ageSettlements={ageSettlements}
          />
        ))}
      </div>
    </div>
  );
}