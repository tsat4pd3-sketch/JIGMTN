/* MobileHome — industrial hi-vis status board (mobile) */

import { useMemo } from 'react';
import { derivePlanStatus, daysUntilDue } from './pmPlan.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', amber:'#ffb000', steel:'#6b6b6b' };

const Sparkbars = ({ values, max=8, height=18, accent=c.ink, threshold=6 }) => (
  <div style={{ display:'flex', alignItems:'flex-end', gap:1.5, height }}>
    {values.map((v,i)=>{
      const h = Math.max(2, (v/max)*height);
      return <div key={i} style={{ width:3, height:h, background: v>=threshold ? c.ng : accent }} />;
    })}
  </div>
);

export default function MobileHome({ session, jigList, records, plans = [], onLogout, onNavigate, onPickJig, onHistory, hasToken, saveStatus }) {
  const { stats, jigData } = useMemo(() => {
    const now = Date.now();
    const data = jigList.map(j => {
      const recs = records.filter(r=>r.jigId===j.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      const last = recs[0];
      const lastDate = last?.createdAt;
      const daysSince = lastDate ? Math.floor((now-lastDate)/86400000) : 999;
      const isNG = last?.overallResult === 'NG';
      // synthetic trend: count of checks per day for last 10 days
      const trend = Array(10).fill(0);
      recs.slice(0,30).forEach(r=>{
        const d = Math.floor((now-(r.createdAt||0))/86400000);
        if (d>=0 && d<10) trend[9-d]++;
      });
      let status = 'never';
      if (isNG) status = 'ng';
      else if (daysSince < 999 && daysSince <= 14) status = 'ok';
      else if (daysSince < 999 && daysSince <= 30) status = 'due';
      else status = 'overdue';
      return { ...j, last, daysSince, status, trend, isNG };
    });
    const stats = {
      overdue: data.filter(d=>d.status==='overdue' || d.status==='never').length,
      due: data.filter(d=>d.status==='due').length,
      ng: data.filter(d=>d.status==='ng').length,
      total: data.length,
    };
    return { stats, jigData: data };
  }, [jigList, records]);

  const assignedPlans = useMemo(() => plans
    .map(p => ({ ...p, statusView: derivePlanStatus(p), jig: jigList.find(j => j.id === p.jigId) }))
    .filter(p => p.statusView !== 'completed' && (!p.assignedToEmp || p.assignedToEmp === session?.emp || ['engineer','supervisor','admin'].includes(session?.role)))
    .sort((a,b) => `${a.dueDate}`.localeCompare(`${b.dueDate}`))
    .slice(0, 6), [plans, jigList, session]);

  const now = new Date();
  const time = now.toTimeString().slice(0,5);

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui', maxWidth:520, margin:'0 auto', paddingBottom:90 }}>
      {/* Hazard band */}
      <div style={{ height:6, backgroundImage:`repeating-linear-gradient(-45deg, ${c.hi} 0 14px, ${c.ink} 14px 28px)` }} />

      {/* Header */}
      <div style={{ background:c.ink, color:'#fff', padding:'10px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:c.hi }}>
              LINE 061 · BRANCH 01 · FM-JIG-003
            </div>
            <div style={{ fontSize:16, fontWeight:700 }}>PM JIG · Status</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {saveStatus==='saving' && <span style={{fontSize:9,color:c.amber}}>⏳</span>}
            {saveStatus==='saved'  && <span style={{fontSize:9,color:c.ok}}>✓</span>}
            {saveStatus==='error'  && <span style={{fontSize:9,color:c.ng}}>⚠</span>}
            <button onClick={onLogout} style={{
              padding:'4px 8px', background:'transparent', border:`1.5px solid ${c.hi}`, color:c.hi,
              fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
            }}>↩ OUT</button>
          </div>
        </div>
      </div>

      {/* Shift banner */}
      <div style={{
        background:c.ink, color:'#fff', padding:'8px 14px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        borderTop:'1px solid #2a2a2a',
      }}>
        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:c.hi }}>SHIFT {session?.shift || 'A'}</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#fff', fontWeight:700 }}>
              {session?.shift==='A' ? '06:00 → 14:00' : session?.shift==='B' ? '14:00 → 22:00' : '22:00 → 06:00'}
            </div>
          </div>
          <div style={{ width:1, height:24, background:'#2a2a2a' }} />
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:c.hi, color:c.ink, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>
              {(session?.name||'?').charAt(0)}
            </div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:9, color:'#cdcdcd', lineHeight:1.3 }}>
              <div className="thai" style={{ color:'#fff', fontFamily:'Sarabun, system-ui', fontSize:11 }}>{session?.name}</div>
              <div style={{ color:'#888' }}>{session?.emp}</div>
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono', fontSize:13, color:c.hi, fontWeight:700 }}>{time}</div>
      </div>

      {/* KPI tiles */}
      <div style={{ padding:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {[
          ['OVERDUE', stats.overdue, 'เลยกำหนด', c.ng],
          ['DUE', stats.due, 'ครบกำหนด', c.hi],
          ['OPEN NG', stats.ng, 'รอแก้ไข', c.ink],
        ].map(([l,v,sub,a])=>(
          <div key={l} style={{ background:'#fff', border:`1px solid ${c.line}`, borderTop:`3px solid ${a}`, padding:'10px 8px', textAlign:'left' }}>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, letterSpacing:'0.08em', color:c.steel }}>{l}</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:24, fontWeight:700, color:c.ink, lineHeight:1.1 }}>{v}</div>
            <div style={{ fontFamily:'Sarabun, system-ui', fontSize:10, color:c.steel }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Token warning */}
      {!hasToken?.ok && (
        <div style={{ margin:'0 12px 8px', padding:'8px 10px', background:'#fbe7e6', border:`1.5px solid ${c.ng}`, color:c.ng, fontSize:11, fontWeight:600 }}>
          ⚠ ไม่ได้เชื่อม SQL API/GitHub — ข้อมูลอาจอยู่ใน device สำหรับเดโม
        </div>
      )}

      {/* Quick nav row */}
      <div style={{ padding:'0 12px 8px', display:'flex', gap:6, flexWrap:'wrap' }}>
        <button onClick={onHistory} style={navBtn(false)}>📋 ประวัติ</button>
        {['engineer','supervisor','admin'].includes(session?.role) && (
          <button onClick={()=>onNavigate('dashboard')} style={navBtn(true)}>📊 Dashboard</button>
        )}
        {['engineer','supervisor','admin'].includes(session?.role) && (
          <button onClick={()=>onNavigate('planning')} style={navBtn(false)}>🗓 PM Plan</button>
        )}
        <button onClick={()=>onNavigate('calibration')} style={navBtn(false)}>🔧 Cal</button>
        {['supervisor','admin'].includes(session?.role) && <button onClick={()=>onNavigate('jigConfig')} style={navBtn(false)}>🧩 JIG Config</button>}
        {session?.role==='admin' && <button onClick={()=>onNavigate('admin')} style={navBtn(false)}>⚙ Admin</button>}
      </div>

      {/* Assigned PM plans */}
      {assignedPlans.length > 0 && (
        <div style={{ margin:'0 12px 10px', background:'#fff', border:`2px solid ${c.ink}` }}>
          <div style={{ padding:'8px 10px', background:c.ink, color:c.hi, fontFamily:'JetBrains Mono', fontSize:10, fontWeight:800, letterSpacing:'0.08em' }}>
            TODAY PM PLAN · งานตามแผน ({assignedPlans.length})
          </div>
          {assignedPlans.map(p => {
            const days = daysUntilDue(p);
            return <button key={p.id} onClick={()=>p.jig && onPickJig(p.jig, p)} style={{
              width:'100%', border:'none', borderBottom:`1px solid ${c.line}`, background:p.statusView==='overdue'?'#fff0f0':'#fff',
              padding:'10px', display:'grid', gridTemplateColumns:'1fr auto', gap:8, textAlign:'left', cursor:'pointer',
            }}>
              <div>
                <div className="mono" style={{ fontSize:11, fontWeight:800 }}>{p.jigId} · {p.jigName || p.jig?.name}</div>
                <div className="thai" style={{ fontSize:11, color:c.steel }}>{p.engineerNote || 'ตรวจตามมาตรฐาน PM'}</div>
                <div className="mono" style={{ fontSize:9, color:c.steel }}>DUE {p.dueDate} · {p.frequency} · {p.priority}</div>
              </div>
              <span className="pill-v2" style={{ alignSelf:'start', color:p.statusView==='overdue'?c.ng:c.hi }}>
                {days === 0 ? 'TODAY' : days < 0 ? `${Math.abs(days)}D LATE` : `${days}D`}
              </span>
            </button>;
          })}
        </div>
      )}

      {/* Jig list */}
      <div style={{ background:'#fff', borderTop:`2px solid ${c.ink}` }}>
        {jigData.map(j => (
          <button key={j.id} onClick={()=>onPickJig(j)} style={{
            display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', minHeight:64,
            borderBottom:`1px solid ${c.line}`, background: j.status==='ng'||j.status==='overdue' ? '#fff5f0' : '#fff',
            width:'100%', textAlign:'left', cursor:'pointer', border:'none', borderTop:'none',
          }}>
            <div style={{
              width:4, alignSelf:'stretch', minHeight:48,
              background: j.status==='overdue' || j.status==='never' ? c.ng :
                         j.status==='ng' ? c.ng :
                         j.status==='due' ? c.hi : c.ok,
            }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6 }}>
                <span style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, color:c.ink, letterSpacing:'0.04em' }}>{j.id}</span>
                <span style={{
                  display:'inline-flex', padding:'2px 7px', borderRadius:2,
                  fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                  background: j.status==='overdue'||j.status==='never' ? c.ng :
                             j.status==='ng' ? c.ng :
                             j.status==='due' ? c.hi : '#e7f3e8',
                  color: j.status==='ok' ? c.ok : (j.status==='due' ? c.ink : '#fff'),
                  border: `1.5px solid ${j.status==='ok' ? c.ok : j.status==='due' ? c.hi : c.ng}`,
                }}>
                  {j.status==='never' ? 'NEVER' : j.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:c.ink, marginTop:2, lineHeight:1.2 }}>{j.name}</div>
              <div style={{ fontFamily:'Sarabun, system-ui', fontSize:11, color:c.steel, marginTop:1 }}>{j.process}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:5, gap:8 }}>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:9, color:c.steel, letterSpacing:'0.04em' }}>
                  {j.daysSince>=999 ? 'NEVER CHECKED' : j.daysSince===0 ? 'TODAY' : `${j.daysSince}D AGO`}
                  {j.last && ` · ${j.last.inspector || ''}`}
                </div>
                <Sparkbars values={j.trend} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:520, margin:'0 auto',
        padding:12, background:'linear-gradient(180deg, transparent, rgba(244,241,234,0.95) 30%)',
      }}>
        <button onClick={()=>onPickJig(null)} style={{
          width:'100%', height:56, background:c.ink, color:c.hi, border:'none',
          fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700, letterSpacing:'0.08em',
          boxShadow:`0 4px 0 #1a1a1a`, cursor:'pointer',
        }}>＋ NEW PM CHECK · เริ่มตรวจ</button>
      </div>
    </div>
  );
}

const navBtn = (active) => ({
  padding:'6px 12px',
  background: active ? c.hi : '#fff',
  color: c.ink,
  border:`1.5px solid ${c.ink}`,
  fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer',
});
