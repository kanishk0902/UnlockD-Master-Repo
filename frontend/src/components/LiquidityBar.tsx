import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/money';

const SEGMENT_COLORS = ['#34d399', '#60a5fa', '#f2a65a', '#c084fc', '#f472b6'];

export function LiquidityBar() {
  const { state } = useFinance();
  const { accounts } = state;
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <section className="liquidity">
      <div className="liquidity__header">
        <span className="liquidity__title">Liquidity Pool Distribution</span>
        <span className="liquidity__total">{formatCurrency(total)} total</span>
      </div>

      <div className="liquidity__bar" role="img" aria-label="Balance distribution across accounts">
        {accounts.map((acc, i) => {
          const pct = total > 0 ? (acc.balance / total) * 100 : 0;
          return (
            <div
              key={acc.id}
              className="liquidity__segment"
              style={{ width: `${pct}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              title={`${acc.name}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      <div className="liquidity__legend">
        {accounts.map((acc, i) => {
          const pct = total > 0 ? (acc.balance / total) * 100 : 0;
          return (
            <div className="liquidity__legend-item" key={acc.id}>
              <span
                className="liquidity__dot"
                style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              />
              <span className="liquidity__legend-name">{acc.name}</span>
              <span className="liquidity__legend-pct">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}