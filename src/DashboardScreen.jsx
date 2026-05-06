import { useState, useMemo } from 'react';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', steel:'#6b6b6b', amber:'#ffb000' };

const Sparkbars = ({ values, max=10, height=24, accent=c.ink, threshold }) => (
  <div style={{ display:'flex', alignItems:'flex-end', gap:2, height }}>
    {values.map((v,i)=>{
      const h = Math.max(2, (v/max)*height);
      return <div key={i} style={{ width:5, height:h, background: threshold && v>=threshold ? c.ng : accent }} />;
    })}
  </div>
);

export default function DashboardScreen({ records, jigList, session, onBack, onOpenJig }) {
  const [range, setRange] = useState('30'); // days

  const cutoff = Date.now() - parseInt(range)*86400000;
  const inRange = records.filter(r => (r.createdAt||0) >= cutoff);

  const totalChecks = inRange.length;
  const ngCount = inRange.filter(r=>r.overallResult==='NG').length;
  const ngRate = totalChecks ? ((ngCount/totalChecks)*100).toFixed(1) : '0.0';

  // Daily check trend (last N days)
  const days = parseInt(range);
  const trend = useMemo(()=>{
    const arr = Array(Math.min(days, 30)).fill(0);
    const now = new Date(); now.setHours(0,0,0,0);
    inRange.forEach(r=>{
      if (!r.pmDate) return;
      const d = new Date(r.pmDate+'T00:00:00');
      const diff = Math.floor((now - d)/86400000);
      const idx = arr.length - 1 - diff;
      if (idx >= 0 && idx < arr.length) arr[idx]++;
    });
    return arr;
  }, [inRange.length, days]);

  // Per-jig stats
  const jigStats = jigList.map(j => {
    const jr = inRange.filter(r=>r.jigId===j.id);
    const ng = jr.filter(r=>r.overallResult==='NG').length;
    return {
      ...j,
      count: jr.length,
      ng,
      ngRate: jr.length ? (ng/jr.length)*100 : 0,
      lastCheck: jr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0],
    };
  }).sort((a,b)=> b.ngRate - a.ngRate || b.ng - a.ng);

  // Inspector leaderboard
  const inspMap = {};
  inRange.forEach(r=>{
    if (!r.inspector) return;
    if (!inspMap[r.inspector]) inspMap[r.inspector] = { name:r.inspector, total:0, ng:0 };
    inspMap[r.inspector].total++;
    if (r.overallResult==='NG') inspMap[r.inspector].ng++;
  });
  const inspectors = Object.values(inspMap).sort((a,b)=>b.total-a.total).slice(0,8);

  const topProblemJigs = jigStats.filter(j=>j.ng>0).slice(0,5);
  const maxTrend = Math.max(1, ...trend);

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui' }}>
      <div className="hazard" style={{ height:6 }} />
      <div style={{ background:c.ink, color:'#fff', padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="kicker" style={{ color:c.hi }}>SUPERVISOR DASHBOARD · {session?.shift && `SHIFT ${session.shift}`}</div>
          <div style={{ fontSize:18, fontWeight:700 }}>PM JIG Analytics · ภาพรวม</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['7','30','90'].map(d=>(
            <button key={d} onClick={()=>setRange(d)} style={{
              padding:'6px 12px',
              background: range===d ? c.hi : 'transparent',
              color: range===d ? c.ink : '#fff',
              border:`1.5px solid ${c.hi}`,
              fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>{d}D</button>
          ))}
          <button onClick={onBack} style={{ marginLeft:8, padding:'6px 12px', background:'transparent', color:'#fff', border:'1.5px solid #fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>← BACK</button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:20 }}>
        {/* KPI tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          {[
            ['TOTAL CHECKS', totalChecks, 'การตรวจทั้งหมด', c.ink],
            ['NG COUNT', ngCount, 'พบความผิดปกติ', c.ng],
            ['NG RATE', ngRate+'%', 'อัตราพบ NG', parseFloat(ngRate)>5 ? c.ng : c.ok],
            ['ACTIVE JIGS', new Set(inRange.map(r=>r.jigId)).size + ' / ' + jigList.length, 'จิ๊กที่มีการตรวจ', c.hi],
          ].map(([l,v,sub,a])=>(
            <div key={l} style={{ background:'#fff', border:`1px solid ${c.line}`, borderLeft:`3px solid ${a}`, padding:'14px 16px' }}>
              <div className="kicker">{l}</div>
              <div className="mono" style={{ fontSize:30, fontWeight:700, color:c.ink, lineHeight:1, letterSpacing:'-0.02em', marginTop:4 }}>{v}</div>
              <div className="thai" style={{ fontSize:11, color:c.steel, marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Trend */}
        <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
            <div>
              <div className="kicker">DAILY CHECK VOLUME · {range} วัน</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Checks per day</div>
            </div>
            <div className="mono" style={{ fontSize:11, color:c.steel }}>peak: {maxTrend} · avg: {(trend.reduce((a,b)=>a+b,0)/trend.length).toFixed(1)}</div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80, padding:'0 4px', borderBottom:`1.5px solid ${c.ink}` }}>
            {trend.map((v,i)=>(
              <div key={i} style={{ flex:1, height: Math.max(2, (v/maxTrend)*78), background: v===0 ? c.line : c.ink, position:'relative' }}>
                {v>0 && <div className="mono" style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', fontSize:8, color:c.steel }}>{v}</div>}
              </div>
            ))}
          </div>
          <div className="mono" style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:c.steel, marginTop:4 }}>
            <span>{range}D AGO</span><span>TODAY</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
          {/* Problem jigs */}
          <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16 }}>
            <div className="kicker" style={{ marginBottom:10 }}>TOP PROBLEM JIGS · จิ๊กที่ต้องดูแล</div>
            {topProblemJigs.length === 0 && <div style={{ padding:30, textAlign:'center', color:c.steel, fontSize:12 }}>ไม่มี NG ในช่วงเวลานี้ — All clear ✓</div>}
            {topProblemJigs.map(j=>(
              <div key={j.id} onClick={()=>onOpenJig(j)} style={{
                display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:12, alignItems:'center',
                padding:'10px 8px', borderBottom:`1px solid ${c.line}`, cursor:'pointer',
              }}>
                <span className="mono" style={{ fontSize:10, fontWeight:700, padding:'3px 6px', background:c.paper, border:`1px solid ${c.line}` }}>{j.id}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{j.name}</div>
                  <div className="mono" style={{ fontSize:9, color:c.steel }}>{j.count} CHECKS · {j.ng} NG</div>
                </div>
                <div style={{
                  fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700,
                  color: j.ngRate > 20 ? c.ng : j.ngRate > 5 ? c.amber : c.ok,
                }}>{j.ngRate.toFixed(0)}%</div>
                <div style={{ width:60 }}>
                  <div style={{ height:6, background:c.line, position:'relative' }}>
                    <div style={{ position:'absolute', inset:0, width: Math.min(100, j.ngRate*2)+'%', background: j.ngRate>20 ? c.ng : c.hi }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Inspectors */}
          <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16 }}>
            <div className="kicker" style={{ marginBottom:10 }}>INSPECTORS · ผู้ตรวจ</div>
            {inspectors.length === 0 && <div style={{ padding:20, textAlign:'center', color:c.steel, fontSize:12 }}>—</div>}
            {inspectors.map((u,i)=>(
              <div key={u.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom: i<inspectors.length-1 ? `1px solid ${c.line}` : 'none' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:c.hi, color:c.ink, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>
                  {u.name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</div>
                  <div className="mono" style={{ fontSize:9, color:c.steel }}>{u.total} CHECKS · {u.ng} NG</div>
                </div>
                <div className="mono" style={{ fontSize:14, fontWeight:700 }}>{u.total}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent NG */}
        <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16, marginTop:16 }}>
          <div className="kicker" style={{ marginBottom:10 }}>RECENT NG · NG ล่าสุด</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:c.paper, borderBottom:`1.5px solid ${c.ink}` }}>
                {['DATE','JIG','NAME','INSPECTOR','SHIFT'].map(h=>(
                  <th key={h} className="kicker" style={{ padding:'6px 8px', textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inRange.filter(r=>r.overallResult==='NG').slice(0,8).map(r=>(
                <tr key={r.id} style={{ borderBottom:`1px solid ${c.line}` }}>
                  <td className="mono" style={{ padding:'8px', fontSize:11 }}>{r.pmDate}</td>
                  <td className="mono" style={{ padding:'8px', fontSize:11, fontWeight:700, color:c.ng }}>{r.jigId}</td>
                  <td style={{ padding:'8px', fontSize:11 }}>{r.jigName}</td>
                  <td style={{ padding:'8px', fontSize:11 }}>{r.inspector}</td>
                  <td className="mono" style={{ padding:'8px', fontSize:11 }}>{r.shift}</td>
                </tr>
              ))}
              {inRange.filter(r=>r.overallResult==='NG').length===0 && (
                <tr><td colSpan="5" style={{ padding:30, textAlign:'center', color:c.steel, fontSize:12 }}>ไม่มี NG ในช่วงนี้ ✓</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
