import { useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';

const LEVEL_TAG: Record<string, string> = {
  info: 'INFO',
  sign: 'SIGN',
  block: 'BLOCK',
  ok: 'OK',
  error: 'ERR',
};

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour12: false });
}

export function AuditConsole() {
  const { state } = useFinance();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest line whenever a new audit event lands.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.auditEvents.length]);

  const blockedCount = state.auditEvents.filter((e) => e.level === 'block').length;

  return (
    <section className="console">
      <div className="console__titlebar">
        <div className="console__dots">
          <span /><span /><span />
        </div>
        <span className="console__title">HSM Core Security Telemetry</span>
        <span className="console__badge">{blockedCount} blocked</span>
      </div>
      <div className="console__body" ref={scrollRef}>
        {state.auditEvents.length === 0 ? (
          <p className="console__line console__line--info">
            <span className="console__tag console__tag--info">INFO</span>
            Awaiting first transfer… pipeline idle.
          </p>
        ) : (
          state.auditEvents.map((evt) => (
            <p key={evt.id} className={`console__line console__line--${evt.level}`}>
              <span className="console__time">{formatClock(evt.timestamp)}</span>
              <span className={`console__tag console__tag--${evt.level}`}>{LEVEL_TAG[evt.level]}</span>
              {evt.message}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
