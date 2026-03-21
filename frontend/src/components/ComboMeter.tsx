import React, { useEffect, useMemo, useState } from 'react';

export default function ComboMeter({
  comboCount,
  threshold = 5,
}: {
  comboCount: number;
  threshold?: number;
}) {
  const clamped = Math.max(0, comboCount);
  const ratio = Math.min(1, clamped / threshold);
  const isHot = clamped >= threshold;

  const barColor = isHot ? '#22c55e' : '#cbd5e1';
  const textColor = isHot ? '#166534' : '#64748b';

  const [showFire, setShowFire] = useState(isHot);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isHot) {
      const t = window.setTimeout(() => setShowFire(true), 120);
      return () => window.clearTimeout(t);
    }
    setShowFire(false);
  }, [isHot]);

  useEffect(() => {
    if (!isHot) {
      setIsShaking(false);
      return;
    }
    setIsShaking(true);
    const t = window.setTimeout(() => setIsShaking(false), 520);
    return () => window.clearTimeout(t);
  }, [comboCount, isHot]);

  const fireStyle = useMemo<React.CSSProperties>(() => {
    if (!showFire) return { opacity: 0, transform: 'scale(0.85)' };
    return { opacity: 1, transform: 'scale(1)' };
  }, [showFire]);

  return (
    <div
      aria-label="Combo meter"
      style={{
        marginTop: 0,
        padding: '0.75rem',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        animation: isShaking ? 'comboShake 520ms ease-in-out' : 'none',
      }}
    >
      <style>{`
        @keyframes comboShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-3px); }
          30% { transform: translateX(3px); }
          45% { transform: translateX(-2px); }
          60% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
          90% { transform: translateX(1px); }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <div style={{ fontWeight: 900, color: textColor, fontSize: '1.05rem' }}>
            Combo: {clamped}
          </div>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              transition: 'opacity 200ms ease, transform 220ms ease',
              ...fireStyle,
            }}
          >
            🔥
          </span>
        </div>
        <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.9rem' }}>
          {Math.min(clamped, threshold)}/{threshold}
        </div>
      </div>

      <div
        aria-label="Combo progress"
        style={{
          marginTop: '0.6rem',
          height: '10px',
          borderRadius: '999px',
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.round(ratio * 100)}%`,
            backgroundColor: barColor,
            transition: 'width 220ms ease, background-color 260ms ease',
            borderRadius: '999px',
          }}
        />
      </div>
    </div>
  );
}
