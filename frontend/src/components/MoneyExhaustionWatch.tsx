import { useFinance } from '../context/FinanceContext';

export function MoneyExhaustionWatch() {
  const { state } = useFinance();
  const { accounts, transactions } = state;

  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);

  const debitTransactions = transactions.filter((t: any) => {
    const isCompleted = t.status === 'completed' || t.status === 'COMPLETED';
    return isCompleted && t.amount > 0 && t.fromAccountId.startsWith('acc');
  });

  let avgDailySpend = 0;
  let daysRemaining = Infinity;

  if (debitTransactions.length > 0) {
    const timestamps = debitTransactions.map((t: any) => Date.parse(t.timestamp));
    const maxTime = Math.max(...timestamps);
    const minTime = Math.min(...timestamps);
    
    const totalDays = Math.max(1, Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)));
    const totalSpent = debitTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    
    avgDailySpend = totalSpent / totalDays;
    
    if (avgDailySpend > 0) {
      daysRemaining = Math.max(0, Math.floor(totalBalance / avgDailySpend));
    }
  }

  // 1. Loading State (No Data)
  if (avgDailySpend === 0 || debitTransactions.length < 2) {
    return (
      <div style={{ backgroundColor: '#111827', border: '1px solid #1e293b', padding: '20px', borderRadius: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Exhaustion Forecast
        </div>
        <div style={{ color: '#64748b', fontSize: '13px' }}>
          Aggregating transaction data to calculate runway.
        </div>
      </div>
    );
  }

  // 2. Active State
  const isCritical = daysRemaining <= 7;
  const cardBorder = isCritical ? '1px solid #ef4444' : '1px solid #1e293b';
  const countdownColor = isCritical ? '#ef4444' : '#f8fafc';
  const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.1)' : '#1e293b';
  const badgeColor = isCritical ? '#ef4444' : '#94a3b8';

  return (
    <div style={{ backgroundColor: '#111827', border: cardBorder, padding: '24px', borderRadius: '8px' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#f8fafc', letterSpacing: '0.02em' }}>
          {isCritical ? 'Runway Critical' : 'Exhaustion Forecast'}
        </h3>
        <span style={{ fontSize: '10px', padding: '4px 8px', backgroundColor: badgeBg, color: badgeColor, borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isCritical ? 'High Risk' : 'Analyzing'}
        </span>
      </div>

      {/* Data Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg Daily Spend
          </p>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: '500', color: '#f8fafc', fontFamily: 'monospace' }}>
            ₹{avgDailySpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Est. Exhaustion
          </p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: countdownColor, fontFamily: 'monospace' }}>
            {daysRemaining === Infinity ? '∞' : `${daysRemaining} Days`}
          </p>
        </div>
      </div>

      {/* Contextual Footer */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
        Based on cash liquidity of <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>₹{totalBalance.toLocaleString('en-IN')}</span> and historical outlays.
      </div>
    </div>
  );
}
