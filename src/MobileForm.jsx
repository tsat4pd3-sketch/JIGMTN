/* MobileForm — industrial hi-vis 3-shot measurement form
   Mobile-first redesign of the v1 PM check form.
   Logic preserved from v1: judgeLP, judgeSD, GitHub Issues backend. */

import { useState, useMemo } from 'react';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', amber:'#ffb000', steel:'#6b6b6b' };

const judgeLP = (val,max,min) => { const n=parseFloat(val); if(isNaN(n)) return null; return (n>=min&&n<=max)?'OK':'NG'; };
const judgeSD = (val, max = 0.30) => { const n=parseFloat(val), m=parseFloat(max); if(isNaN(n)) return null; return n<(isNaN(m)?0.30:m)?'OK':'NG'; };

const Kicker = ({ children, color }) => (
  <div style={{
    fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700,
    letterSpacing:'0.12em', textTransform:'uppercase', color: color || c.steel,
  }}>{children}</div>
);

const Pill = ({ children, kind }) => {
  const map = {
    ok:  { bg:'#e7f3e8', col:c.ok,  bd:c.ok },
    ng:  { bg:c.ng,      col:'#fff', bd:c.ng },
    pending: { bg:c.paper, col:c.steel, bd:c.line },
  };
  const s = map[kind] || map.pending;
  return <span style={{
    display:'inline-flex', alignItems:'center', padding:'2px 7px',
    background:s.bg, color:s.col, border:`1.5px solid ${s.bd}`, borderRadius:2,
    fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, letterSpacing:'0.06em',
  }}>{children}</span>;
};

/* Numeric keypad — full-width grid, big targets */
function Numpad({ onKey, onClear }) {
  const keys = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:4 }}>
      {keys.map(k => (
        <button key={k} onClick={()=>onKey(k)} style={{
          height:44, background: k==='⌫' ? c.ink : '#fff',
          color: k==='⌫' ? c.hi : c.ink,
          border:`1.5px solid ${c.ink}`,
          fontFamily:'JetBrains Mono', fontSize:18, fontWeight:700, cursor:'pointer',
        }}>{k}</button>
      ))}
    </div>
  );
}

/* One LP / SD measurement with 3 shots + avg + auto-judge */
function MeasureCard({ item, kind, axis, value, onChange }) {
  // value: { shots: [s1,s2,s3], active: 0|1|2 }
  const v = value || { shots:['','',''], active:0 };
  const [pad, setPad] = useState(false);

  const writeShot = (i, val) => {
    const next = { ...v, shots: v.shots.map((s,j)=>j===i?val:s) };
    // auto-advance
    if (val && i < 2) next.active = i+1;
    onChange(next);
  };
  const onKey = (k) => {
    const i = v.active;
    let s = v.shots[i] || '';
    if (k === '⌫') s = s.slice(0,-1);
    else if (k === '.' && s.includes('.')) {} 
    else s = s + k;
    writeShot(i, s);
  };

  const nums = v.shots.map(s => parseFloat(s)).filter(n=>!isNaN(n));
  const avg = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length) : null;

  let verdict = null;
  if (avg !== null) {
    if (kind === 'lp') verdict = judgeLP(avg, item.max, item.min);
    else if (kind === 'sd') verdict = judgeSD(avg, item.max);
  }
  const allFilled = v.shots.every(s => s !== '');

  const fmtSpec = (n) => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '—';
  const spec = kind === 'lp' ? `${fmtSpec(item.min)} → ${fmtSpec(item.max)}`
             : kind === 'sd' ? `< ${fmtSpec(item.max ?? 0.30)}`
             : '—';
  const label = `${item.id || item.label}${axis ? ' · AXIS ' + axis : ''}`;

  return (
    <div style={{
      background:'#fff',
      border: pad ? `2px solid ${c.hi}` : `1.5px solid ${c.line}`,
      padding:12, marginBottom:8,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
        <div>
          <Kicker color={pad ? c.hi : c.steel}>{pad ? 'CURRENT · กำลังวัด' : 'MEASURE'}</Kicker>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700, color:c.ink }}>{label}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <Kicker>SPEC</Kicker>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700 }}>{spec}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
        {[0,1,2].map(i => (
          <button key={i} onClick={()=>{ onChange({...v, active:i}); setPad(true); }} style={{
            background: v.active===i && pad ? '#fff5f0' : c.paper,
            border:`1.5px solid ${v.active===i && pad ? c.hi : c.line}`,
            padding:'8px 4px', textAlign:'center', position:'relative', cursor:'pointer',
          }}>
            <Kicker color={v.active===i && pad ? c.hi : c.steel}>CHECK {i+1}</Kicker>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700, color:c.ink, minHeight:22 }}>
              {v.shots[i] || <span style={{ color: pad && v.active===i ? c.hi : c.line }}>__.__</span>}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, padding:'8px 10px', background:c.paper, alignItems:'center', justifyContent:'space-between', marginBottom:pad?10:0 }}>
        <div>
          <Kicker>AVG</Kicker>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700 }}>
            {avg !== null ? avg.toFixed(2) : '—'}
          </div>
        </div>
        {verdict && allFilled && <Pill kind={verdict==='OK'?'ok':'ng'}>{verdict==='OK'?'OK · ปกติ':'NG · ผิด'}</Pill>}
        {!allFilled && <Pill kind="pending">{nums.length}/3 · รอ</Pill>}
      </div>

      {pad && (
        <>
          <Numpad onKey={onKey} />
          <button onClick={()=>setPad(false)} style={{
            width:'100%', marginTop:6, padding:'6px', background:'transparent',
            border:`1px solid ${c.line}`, fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, color:c.steel, cursor:'pointer',
          }}>HIDE PAD · ซ่อนแป้น</button>
        </>
      )}
    </div>
  );
}

/* Simple OK/NG checklist row */
function ChecklistRow({ item, value, onChange }) {
  return (
    <div style={{ background:'#fff', border:`1.5px solid ${c.line}`, padding:10, marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, color:c.ink }}>{item.id}</div>
        <div style={{ fontFamily:'Sarabun, system-ui', fontSize:11, color:c.steel, marginTop:1 }}>{item.label}</div>
      </div>
      <div style={{ display:'flex', gap:4 }}>
        {['OK','NG'].map(opt => (
          <button key={opt} onClick={()=>onChange(opt)} style={{
            minWidth:54, height:40, padding:'0 12px',
            background: value===opt ? (opt==='OK'?c.ok:c.ng) : '#fff',
            color: value===opt ? '#fff' : c.ink,
            border:`1.5px solid ${value===opt ? (opt==='OK'?c.ok:c.ng) : c.ink}`,
            fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700, cursor:'pointer',
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

export default function MobileForm({ jig, session, plan, onSubmit, onCancel, diagramSrc }) {
  const [secIdx, setSecIdx] = useState(0);
  const [data, setData] = useState({});  // { [secId]: { [itemId]: ... } }
  const [remarks, setRemarks] = useState({});

  const sections = jig.sections || [];
  const sec = sections[secIdx];
  const total = sections.length;

  const setItem = (secId, itemId, val) => {
    setData(prev => ({ ...prev, [secId]: { ...(prev[secId]||{}), [itemId]: val } }));
  };

  // Section completion
  const isSecComplete = (s) => {
    const sd = data[s.id] || {};
    return s.items.every(it => {
      const v = sd[it.id];
      if (!v) return false;
      if (s.type === 'locatepin_xy') return v.X?.shots?.every(x=>x!=='') && v.Y?.shots?.every(x=>x!=='');
      if (s.type === 'locatepin_simple') return v.shots?.every(x=>x!=='');
      if (s.type === 'feeler') return v.shots?.every(x=>x!=='');
      return ['OK','NG'].includes(v);
    });
  };

  const ngFound = useMemo(() => {
    let count = 0;
    sections.forEach(s => {
      const sd = data[s.id] || {};
      Object.entries(sd).forEach(([itId, v]) => {
        if (v === 'NG') count++;
        if (v?.shots) {
          const nums = v.shots.map(x=>parseFloat(x)).filter(x=>!isNaN(x));
          if (nums.length === 3) {
            const avg = nums.reduce((a,b)=>a+b,0)/3;
            const item = s.items.find(i => i.id === itId);
            if (s.type === 'feeler' && judgeSD(avg, item?.max)==='NG') count++;
            if (s.type === 'locatepin_simple' && item && judgeLP(avg, item.max, item.min)==='NG') count++;
          }
        }
      });
    });
    return count;
  }, [data, sections]);

  const renderSection = () => {
    if (!sec) return null;
    const sd = data[sec.id] || {};

    if (sec.type === 'locatepin_xy') {
      return sec.items.map(it => (
        <div key={it.id} style={{ marginBottom:12 }}>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, color:c.ink, marginBottom:4 }}>
            {it.id} · LOCATE PIN (Ø-0.20) · ค่ามาตรฐาน {it.nom?.toFixed?.(2)}
          </div>
          <MeasureCard item={it} kind="lp" axis="X"
            value={sd[it.id]?.X}
            onChange={(v)=> setItem(sec.id, it.id, { ...(sd[it.id]||{}), X: v })} />
          <MeasureCard item={it} kind="lp" axis="Y"
            value={sd[it.id]?.Y}
            onChange={(v)=> setItem(sec.id, it.id, { ...(sd[it.id]||{}), Y: v })} />
        </div>
      ));
    }
    if (sec.type === 'locatepin_simple') {
      return sec.items.map(it => (
        <MeasureCard key={it.id} item={it} kind="lp"
          value={sd[it.id]}
          onChange={(v)=> setItem(sec.id, it.id, v)} />
      ));
    }
    if (sec.type === 'feeler') {
      return sec.items.map(it => (
        <MeasureCard key={it.id} item={{...it, max:0.30, min:0}} kind="sd"
          value={sd[it.id]}
          onChange={(v)=> setItem(sec.id, it.id, v)} />
      ));
    }
    // checklist / su / bolt / etc
    return sec.items.map(it => (
      <ChecklistRow key={it.id} item={it}
        value={sd[it.id]}
        onChange={(v)=> setItem(sec.id, it.id, v)} />
    ));
  };

  const goNext = () => {
    if (secIdx < total - 1) setSecIdx(secIdx + 1);
    else handleSubmit();
  };
  const goPrev = () => { if (secIdx > 0) setSecIdx(secIdx - 1); };

  const handleSubmit = () => {
    // Compute overall result
    let overall = 'OK';
    sections.forEach(s => {
      const sd = data[s.id] || {};
      Object.entries(sd).forEach(([itId, v]) => {
        if (v === 'NG') overall = 'NG';
        const checkAvg = (val, type, item) => {
          if (!val?.shots) return;
          const nums = val.shots.map(x=>parseFloat(x)).filter(x=>!isNaN(x));
          if (nums.length !== 3) return;
          const avg = nums.reduce((a,b)=>a+b,0)/3;
          if (type === 'feeler' && judgeSD(avg, item?.max)==='NG') overall='NG';
          if (type === 'locatepin_simple' && item && judgeLP(avg, item.max, item.min)==='NG') overall='NG';
        };
        if (s.type === 'locatepin_xy') {
          const item = s.items.find(i=>i.id===itId);
          checkAvg(v?.X, 'locatepin_simple', item);
          checkAvg(v?.Y, 'locatepin_simple', item);
        } else if (s.type === 'locatepin_simple') {
          const item = s.items.find(i=>i.id===itId);
          checkAvg(v, 'locatepin_simple', item);
        } else if (s.type === 'feeler') {
          const item = s.items.find(i=>i.id===itId);
          checkAvg(v, 'feeler', item);
        }
      });
    });

    const record = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      planId: plan?.id || null,
      jigId: jig.id,
      jigName: jig.name,
      pmDate: new Date().toISOString().slice(0,10),
      shift: session?.shift || 'A',
      inspector: session?.name || '',
      inspectorEmp: session?.emp || '',
      engineerNote: plan?.engineerNote || '',
      dueDate: plan?.dueDate || '',
      data,
      remarks,
      overallResult: overall,
      createdAt: Date.now(),
    };
    onSubmit(record);
  };

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui', maxWidth:520, margin:'0 auto' }}>
      <div style={{ height:6, backgroundImage:`repeating-linear-gradient(-45deg, ${c.hi} 0 14px, ${c.ink} 14px 28px)` }} />
      <div style={{ background:c.ink, color:'#fff', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <Kicker color={c.hi}>{jig.id} · {jig.process}</Kicker>
          <div style={{ fontSize:14, fontWeight:700 }}>{jig.name}</div>
          {plan && (
            <div style={{ marginTop:4, fontFamily:'JetBrains Mono', fontSize:10, color:c.hi }}>
              PLAN {plan.id} · DUE {plan.dueDate} · {plan.priority?.toUpperCase?.() || 'NORMAL'}
            </div>
          )}
        </div>
        <button onClick={onCancel} style={{
          width:36, height:36, background:'transparent', border:`1.5px solid ${c.hi}`,
          color:c.hi, fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700, cursor:'pointer',
        }}>×</button>
      </div>

      {/* Meta strip */}
      <div style={{ padding:'8px 14px', background:c.ink, color:'#fff', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, borderTop:`1px solid #2a2a2a` }}>
        <div><Kicker color="#888">MODEL</Kicker><div style={{ fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700 }}>{jig.model}</div></div>
        <div><Kicker color="#888">SHIFT</Kicker><div style={{ fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, color:c.hi }}>{session?.shift || 'A'}</div></div>
        <div><Kicker color="#888">INSP</Kicker><div style={{ fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700 }}>{session?.emp || '—'}</div></div>
      </div>

      {/* Section header */}
      {sec && (
        <div style={{ background:c.ink, color:'#fff', padding:'10px 14px', borderTop:`1px solid #2a2a2a` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <Kicker color={c.hi}>SECTION {secIdx+1} / {total}</Kicker>
              <div style={{ fontFamily:'Inter', fontSize:13, fontWeight:700, marginTop:1 }}>{sec.title}</div>
            </div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, color:c.hi }}>
              {sec.items.length} ITEMS
            </div>
          </div>
          <div style={{ display:'flex', gap:2, marginTop:8 }}>
            {sections.map((_,i) => (
              <div key={i} style={{ flex:1, height:3, background: i<secIdx ? c.ok : i===secIdx ? c.hi : '#2a2a2a' }} />
            ))}
          </div>
        </div>
      )}

      {/* Diagram thumb */}
      {plan?.engineerNote && (
        <div style={{ margin:'10px 12px 0', padding:'10px 12px', background:'#fff5f0', border:`1.5px solid ${c.hi}` }}>
          <Kicker color={c.hi}>ENGINEER INSTRUCTION · ข้อกำหนดจากวิศวกร</Kicker>
          <div className="thai" style={{ marginTop:4, fontSize:13, lineHeight:1.45, color:c.ink }}>{plan.engineerNote}</div>
        </div>
      )}

      {diagramSrc && (
        <div style={{ padding:'10px 12px 0' }}>
          <Kicker>ENG · DRAWING / แผนผัง</Kicker>
          <div style={{ marginTop:4, position:'relative', background:'#fff', border:`1px solid ${c.ink}`, padding:4 }}>
            <img src={diagramSrc} alt={jig.id} style={{ width:'100%', maxHeight:140, objectFit:'cover', objectPosition:'top', display:'block' }} />
            <div style={{ position:'absolute', top:8, left:8, padding:'2px 6px', background:c.hi, fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700 }}>
              {jig.id}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div style={{ padding:12 }}>
        {renderSection()}

        <div style={{ marginTop:12 }}>
          <Kicker>REMARKS · หมายเหตุ</Kicker>
          <textarea
            value={remarks[sec?.id] || ''}
            onChange={e => setRemarks(r => ({ ...r, [sec.id]: e.target.value }))}
            placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
            style={{
              marginTop:4, width:'100%', minHeight:60, padding:8,
              border:`1.5px solid ${c.line}`, fontFamily:'Sarabun, system-ui', fontSize:12, resize:'vertical',
            }}
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position:'sticky', bottom:0, background:c.paper,
        padding:12, borderTop:`2px solid ${c.ink}`,
        display:'grid', gridTemplateColumns: secIdx>0 ? '1fr 2fr' : '1fr', gap:8,
      }}>
        {secIdx > 0 && (
          <button onClick={goPrev} style={{
            height:52, background:'#fff', color:c.ink, border:`1.5px solid ${c.ink}`,
            fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700, letterSpacing:'0.06em', cursor:'pointer',
          }}>← BACK</button>
        )}
        <button onClick={goNext} style={{
          height:52,
          background: secIdx === total - 1 ? c.ok : c.hi,
          color: secIdx === total - 1 ? '#fff' : c.ink,
          border:'none', boxShadow: `0 3px 0 ${secIdx===total-1 ? '#1e5320' : '#c44e00'}`,
          fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700, letterSpacing:'0.06em', cursor:'pointer',
        }}>
          {secIdx === total - 1 ? '✓ SUBMIT · ส่งบันทึก' : 'NEXT · ถัดไป →'}
        </button>
      </div>

      {ngFound > 0 && (
        <div style={{ position:'fixed', top:14, right:14, padding:'4px 10px', background:c.ng, color:'#fff', fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, letterSpacing:'0.06em' }}>
          ⚠ {ngFound} NG
        </div>
      )}
    </div>
  );
}
