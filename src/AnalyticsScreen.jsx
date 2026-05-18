import { useState, useMemo } from 'react';

/* ── design tokens (SaaS-clean palette) ───────────────────── */
const cs = {
  bg: '#f8fafc', surface: '#ffffff',
  border: '#e2e8f0', borderStrong: '#cbd5e1',
  text: '#0f172a', muted: '#64748b', subtle: '#94a3b8',
  accent: '#ff6a00', accentBg: '#fff4ee',
  ok: '#10b981', okBg: '#d1fae5',
  ng: '#ef4444', ngBg: '#fee2e2',
  warn: '#f59e0b', warnBg: '#fef3c7',
  blue: '#3b82f6', blueBg: '#eff6ff',
  purple: '#8b5cf6', purpleBg: '#ede9fe',
  ink: '#0d0d0d',
};

/* ── SVG Chart components ──────────────────────────────────── */
function Sparkline({ data, color, w = 64, h = 28 }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - Math.max(1, (v / max) * (h - 2)),
  ]);
  const d    = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h}Z`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`sp-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AreaChart({ data, color = cs.accent, h = 120 }) {
  if (!data || data.length < 2) return <div style={{ height: h }} />;
  const w   = 600;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - Math.max(2, (v / max) * (h - 8)),
  ]);
  const d    = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h}Z`;
  const gid  = `ag-${color.replace('#','')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={data[i] > 0 ? 3 : 0} fill={color} />
      ))}
    </svg>
  );
}

function DonutChart({ ok, ng, size = 130 }) {
  const total = ok + ng;
  if (!total) return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cs.subtle, fontSize: 11 }}>No data</div>
  );
  const r  = 44;
  const cx = size / 2;
  const cy = size / 2;
  const C  = 2 * Math.PI * r;
  const okFrac = ok / total;
  const ngFrac = ng / total;
  return (
    <svg width={size} height={size}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cs.border} strokeWidth={13} />
      {/* NG arc */}
      {ngFrac > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={cs.ng} strokeWidth={13}
          strokeDasharray={`${ngFrac * C} ${C}`}
          strokeDashoffset={0}
          transform={`rotate(${-90 + okFrac * 360},${cx},${cy})`}
          strokeLinecap="butt"
        />
      )}
      {/* OK arc */}
      {okFrac > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={cs.ok} strokeWidth={13}
          strokeDasharray={`${okFrac * C} ${C}`}
          strokeDashoffset={0}
          transform={`rotate(-90,${cx},${cy})`}
          strokeLinecap="butt"
        />
      )}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="700" fill={cs.text} fontFamily="JetBrains Mono">{(okFrac * 100).toFixed(0)}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill={cs.muted} fontFamily="Inter">OK rate</text>
    </svg>
  );
}

function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: cs.border, borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────── */
function KpiCard({ label, value, sub, trend, trendUp, color, sparkData }) {
  const isPositive = trendUp === true;
  const isNegative = trendUp === false;
  return (
    <div style={{
      background: cs.surface, border: `1px solid ${cs.border}`,
      borderRadius: 12, padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: cs.muted }}>{label}</div>
        {sparkData && <Sparkline data={sparkData} color={color || cs.accent} />}
      </div>
      <div style={{ marginTop: 10, fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 800, color: color || cs.text, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
            background: isPositive ? cs.okBg : isNegative ? cs.ngBg : cs.border,
            color: isPositive ? cs.ok : isNegative ? cs.ng : cs.muted,
          }}>
            {isPositive ? '▲' : isNegative ? '▼' : '—'} {trend}
          </span>
        )}
        {sub && <span style={{ fontSize: 11, color: cs.muted }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ── Jig Heat Cell ─────────────────────────────────────────── */
function JigCell({ jig }) {
  const color = jig.status === 'ng' ? cs.ng
    : jig.status === 'overdue' || jig.status === 'never' ? cs.warn
    : jig.status === 'ok' ? cs.ok
    : cs.border;
  return (
    <div title={`${jig.id} · ${jig.name}\n${jig.checks} checks · ${jig.ngCount} NG`} style={{
      width: '100%', paddingBottom: '100%', position: 'relative', borderRadius: 6,
      background: color, opacity: jig.checks === 0 ? 0.3 : 1, cursor: 'help',
    }}>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'JetBrains Mono', fontSize: 7, fontWeight: 700, color: '#fff', lineHeight: 1, textAlign: 'center', padding: 2,
      }}>
        {jig.id.replace('JHYD06-','').replace('GPHYD06-','')}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */

export default function AnalyticsScreen({ records, jigList, session, onBack }) {
  const [range, setRange] = useState('30');

  const days   = parseInt(range);
  const cutoff = Date.now() - days * 86400000;
  const inRange = records.filter(r => (r.createdAt || 0) >= cutoff);

  /* ── computed analytics ────────────────────────────────── */
  const analytics = useMemo(() => {
    const total = inRange.length;
    const ngCount = inRange.filter(r => r.overallResult === 'NG').length;
    const okCount = total - ngCount;
    const ngRate  = total ? (ngCount / total) * 100 : 0;

    // Daily trend
    const buckets = Math.min(days, 30);
    const trend   = Array(buckets).fill(0);
    const trendNg = Array(buckets).fill(0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    inRange.forEach(r => {
      if (!r.pmDate) return;
      const d   = new Date(r.pmDate + 'T00:00:00');
      const diff = Math.floor((now - d) / 86400000);
      const idx  = trend.length - 1 - diff;
      if (idx >= 0 && idx < trend.length) {
        trend[idx]++;
        if (r.overallResult === 'NG') trendNg[idx]++;
      }
    });

    // Prior period comparison
    const priorCutoff  = cutoff - days * 86400000;
    const priorRecords = records.filter(r => (r.createdAt || 0) >= priorCutoff && (r.createdAt || 0) < cutoff);
    const priorTotal   = priorRecords.length;
    const priorNg      = priorRecords.filter(r => r.overallResult === 'NG').length;
    const priorRate    = priorTotal ? (priorNg / priorTotal) * 100 : 0;
    const rateDelta    = ngRate - priorRate;

    // Jig stats
    const jigStats = jigList.map(j => {
      const jr     = inRange.filter(r => r.jigId === j.id);
      const ng     = jr.filter(r => r.overallResult === 'NG').length;
      const last   = jr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      const daysSince = last?.createdAt ? Math.floor((Date.now() - last.createdAt) / 86400000) : 999;
      let status = 'never';
      if (ng > 0) status = 'ng';
      else if (daysSince < 999 && daysSince <= 14) status = 'ok';
      else if (daysSince < 999 && daysSince <= 30) status = 'due';
      else status = 'overdue';
      return { ...j, checks: jr.length, ngCount: ng, ngRate: jr.length ? (ng / jr.length) * 100 : 0, status };
    }).sort((a, b) => b.ngRate - a.ngRate || b.ngCount - a.ngCount);

    // Inspector stats
    const inspMap = {};
    inRange.forEach(r => {
      if (!r.inspector) return;
      if (!inspMap[r.inspector]) inspMap[r.inspector] = { name: r.inspector, total: 0, ng: 0 };
      inspMap[r.inspector].total++;
      if (r.overallResult === 'NG') inspMap[r.inspector].ng++;
    });
    const inspectors = Object.values(inspMap).sort((a, b) => b.total - a.total).slice(0, 8);

    // Active jigs (checked this period)
    const activeJigs = new Set(inRange.map(r => r.jigId)).size;
    const avgPerDay  = total / days;

    // Recent NG
    const recentNg = inRange.filter(r => r.overallResult === 'NG').slice(0, 10);

    // Check streak: consecutive days with at least 1 check
    let streak = 0;
    for (let i = trend.length - 1; i >= 0; i--) {
      if (trend[i] > 0) streak++; else break;
    }

    return { total, ngCount, okCount, ngRate, rateDelta, priorRate, trend, trendNg, jigStats, inspectors, activeJigs, avgPerDay, recentNg, streak };
  }, [records, jigList, days, cutoff]);

  const { total, ngCount, okCount, ngRate, rateDelta, trend, trendNg, jigStats, inspectors, activeJigs, avgPerDay, recentNg, streak } = analytics;
  const maxInsp = Math.max(1, ...inspectors.map(i => i.total));
  const topNg   = jigStats.filter(j => j.ngCount > 0).slice(0, 6);

  return (
    <div style={{ minHeight: '100vh', background: cs.bg, fontFamily: 'Inter, system-ui', color: cs.text }}>

      {/* Header */}
      <div style={{ background: cs.surface, borderBottom: `1px solid ${cs.border}`, padding: '0 20px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cs.accent }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>PM JIG Analytics</div>
              <div style={{ fontSize: 11, color: cs.muted }}>LINE 061 · {session?.shift && `SHIFT ${session.shift} · `}{session?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: cs.bg, border: `1px solid ${cs.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {[['7','7D'],['30','30D'],['90','90D']].map(([v, l]) => (
                <button key={v} onClick={() => setRange(v)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  background: range === v ? cs.accent : 'transparent',
                  color: range === v ? '#fff' : cs.muted,
                  fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700,
                }}>{l}</button>
              ))}
            </div>
            <button onClick={onBack} style={{ padding: '6px 14px', background: cs.ink, color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>← BACK</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 20px 40px' }}>

        {/* KPI Row */}
        <div className="grid-kpi-4">
          <KpiCard
            label="Total Checks" value={total} sub={`${avgPerDay.toFixed(1)}/day avg`}
            color={cs.accent} sparkData={trend}
            trend={total ? null : null}
          />
          <KpiCard
            label="NG Rate" value={`${ngRate.toFixed(1)}%`}
            sub={`${ngCount} defects found`}
            color={ngRate > 10 ? cs.ng : ngRate > 5 ? cs.warn : cs.ok}
            trend={Math.abs(rateDelta).toFixed(1) + '%'}
            trendUp={rateDelta > 0.5 ? false : rateDelta < -0.5 ? true : null}
            sparkData={trendNg}
          />
          <KpiCard
            label="Active Jigs" value={`${activeJigs} / ${jigList.length}`}
            sub="jigs with checks" color={cs.blue}
          />
          <KpiCard
            label="Check Streak" value={`${streak}D`}
            sub="consecutive days active" color={cs.purple}
          />
        </div>

        {/* Charts */}
        <div className="analytics-charts">
          {/* Area chart */}
          <div style={{ background: cs.surface, border: `1px solid ${cs.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Daily Check Volume</div>
                <div style={{ fontSize: 12, color: cs.muted, marginTop: 2 }}>Checks per day · last {range} days</div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: cs.muted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 3, background: cs.accent, borderRadius: 2, display: 'inline-block' }} />
                  Checks
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 3, background: cs.ng, borderRadius: 2, display: 'inline-block' }} />
                  NG
                </span>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <AreaChart data={trend} color={cs.accent} h={120} />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <AreaChart data={trendNg} color={cs.ng} h={120} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: cs.subtle, fontFamily: 'JetBrains Mono', marginTop: 6 }}>
              <span>{range}D AGO</span><span>TODAY</span>
            </div>
          </div>

          {/* Donut */}
          <div style={{ background: cs.surface, border: `1px solid ${cs.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Result Split</div>
            <div style={{ fontSize: 12, color: cs.muted, marginBottom: 16 }}>OK vs NG distribution</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart ok={okCount} ng={ngCount} size={130} />
            </div>
            {[['OK', okCount, cs.ok, cs.okBg], ['NG', ngCount, cs.ng, cs.ngBg]].map(([l, v, col, bg]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: bg, borderRadius: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: col }}>{v}</span>
                <span style={{ fontSize: 11, color: cs.muted }}>{total ? ((v / total) * 100).toFixed(1) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jig health heatmap */}
        <div style={{ background: cs.surface, border: `1px solid ${cs.border}`, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Jig Health Map</div>
              <div style={{ fontSize: 12, color: cs.muted, marginTop: 2 }}>Status of all {jigList.length} jigs in this period</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              {[['OK', cs.ok], ['NG', cs.ng], ['Due', cs.warn], ['No check', cs.border]].map(([l, col]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: col, borderRadius: 2, display: 'inline-block' }} />
                  <span style={{ color: cs.muted }}>{l}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))', gap: 6 }}>
            {jigStats.map(j => <JigCell key={j.id} jig={j} />)}
          </div>
        </div>

        {/* Bottom row */}
        <div className="analytics-bottom">

          {/* Inspector leaderboard */}
          <div style={{ background: cs.surface, border: `1px solid ${cs.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Inspector Activity</div>
            <div style={{ fontSize: 12, color: cs.muted, marginBottom: 16 }}>Checks per person</div>
            {inspectors.length === 0 && <div style={{ color: cs.subtle, fontSize: 12, padding: '20px 0' }}>No data for this period</div>}
            {inspectors.map((u, i) => (
              <div key={u.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: cs.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                      {u.name.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                    {u.ng > 0 && <span style={{ fontSize: 10, padding: '1px 5px', background: cs.ngBg, color: cs.ng, borderRadius: 4, fontWeight: 700 }}>{u.ng} NG</span>}
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: cs.text }}>{u.total}</span>
                </div>
                <HBar value={u.total} max={maxInsp} color={i === 0 ? cs.accent : cs.blue} />
              </div>
            ))}
          </div>

          {/* Top Problem Jigs + Recent NG */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Top problem jigs */}
            <div style={{ background: cs.surface, border: `1px solid ${cs.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Top Problem Jigs</div>
              {topNg.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: cs.ok, fontSize: 13 }}>✓ No NG this period</div>
              )}
              {topNg.map(j => (
                <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700, padding: '2px 5px', background: cs.bg, border: `1px solid ${cs.border}`, borderRadius: 4, color: cs.muted, flexShrink: 0 }}>{j.id.split('-').pop()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.name}</div>
                    <div style={{ fontSize: 10, color: cs.muted, marginTop: 1, fontFamily: 'JetBrains Mono' }}>{j.checks} checks · {j.ngCount} NG</div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 13, color: j.ngRate > 20 ? cs.ng : j.ngRate > 5 ? cs.warn : cs.ok }}>
                    {j.ngRate.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Recent NG */}
            <div style={{ background: cs.surface, border: `1px solid ${cs.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Recent NG Events</div>
              {recentNg.length === 0 && <div style={{ textAlign: 'center', padding: '16px 0', color: cs.ok, fontSize: 13 }}>✓ Clear</div>}
              {recentNg.map(r => (
                <div key={r.id || r.createdAt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${cs.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: cs.ng, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: cs.ng }}>{r.jigId}</div>
                    <div style={{ fontSize: 11, color: cs.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.jigName}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: cs.text }}>{r.pmDate}</div>
                    <div style={{ fontSize: 10, color: cs.muted }}>{r.inspector}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
