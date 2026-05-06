/* HistoryView — simple records list */
const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', steel:'#6b6b6b' };

export default function HistoryView({ records, jigList, onBack }) {
  const sorted = [...records].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui', maxWidth:520, margin:'0 auto' }}>
      <div style={{ height:6, backgroundImage:`repeating-linear-gradient(-45deg, ${c.hi} 0 14px, ${c.ink} 14px 28px)` }} />
      <div style={{ background:c.ink, color:'#fff', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:c.hi }}>HISTORY · ประวัติ</div>
          <div style={{ fontSize:14, fontWeight:700 }}>{sorted.length} records</div>
        </div>
        <button onClick={onBack} style={{ padding:'6px 12px', background:'transparent', border:`1.5px solid ${c.hi}`, color:c.hi, fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>← BACK</button>
      </div>
      <div>
        {sorted.length===0 && <div style={{ padding:40, textAlign:'center', color:c.steel, fontSize:12 }}>ยังไม่มีประวัติ</div>}
        {sorted.map(r => (
          <div key={r.id || r.createdAt} style={{ padding:'10px 14px', borderBottom:`1px solid ${c.line}`, background:'#fff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700 }}>{r.jigId}</span>
              <span style={{
                padding:'2px 7px', fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700,
                background: r.overallResult==='NG' ? c.ng : '#e7f3e8',
                color: r.overallResult==='NG' ? '#fff' : c.ok,
                border:`1.5px solid ${r.overallResult==='NG' ? c.ng : c.ok}`,
              }}>{r.overallResult}</span>
            </div>
            <div style={{ fontSize:12, fontWeight:600, marginTop:2 }}>{r.jigName}</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:c.steel, marginTop:2 }}>
              {r.pmDate} · S{r.shift} · {r.inspector}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
