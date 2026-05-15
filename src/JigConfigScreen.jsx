import { useMemo, useState } from 'react';
import { defaultStandardText, inferStandardType, makeBlankJig, makeBlankPoint, makeBlankSection, normalizeJigConfig, SECTION_TYPE_OPTIONS, STANDARD_TYPE_OPTIONS, sectionTypeSummary } from './jigConfig.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', amber:'#ffb000', steel:'#6b6b6b' };

export default function JigConfigScreen({ jigList, onBack, onSaveJig, onDeleteJig }) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(() => normalizeJigConfig(jigList[0] || makeBlankJig()));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jigList.filter(j => !q || `${j.id} ${j.name} ${j.process} ${j.model}`.toLowerCase().includes(q));
  }, [jigList, query]);

  const setField = (key, value) => setDraft(prev => ({ ...prev, [key]: key === 'id' ? value.toUpperCase() : value, updatedAt: Date.now() }));
  const setSection = (idx, patch) => setDraft(prev => ({
    ...prev,
    sections: prev.sections.map((s, i) => i === idx ? { ...s, ...patch } : s),
    updatedAt: Date.now(),
  }));
  const setPoint = (secIdx, pointIdx, patch) => setDraft(prev => ({
    ...prev,
    sections: prev.sections.map((s, i) => i === secIdx ? {
      ...s,
      items: s.items.map((p, pi) => pi === pointIdx ? { ...p, ...patch } : p),
    } : s),
    updatedAt: Date.now(),
  }));

  const save = () => {
    const next = normalizeJigConfig(draft);
    if (!next.id || !next.name) return alert('กรุณากรอก JIG ID และชื่อ JIG/FIXTURE');
    if (!next.sections.length || next.sections.some(s => !s.items.length)) return alert('ต้องมี Section และ Check point อย่างน้อย 1 รายการ');
    onSaveJig(next);
    setDraft(next);
  };

  const remove = () => {
    if (!draft.id || !confirm(`Delete/disable ${draft.id}?`)) return;
    onDeleteJig(draft.id);
    setDraft(makeBlankJig());
  };

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui' }}>
      <div style={{ height:8, backgroundImage:`repeating-linear-gradient(-45deg, ${c.hi} 0 14px, ${c.ink} 14px 28px)` }} />
      <div style={{ background:c.ink, color:'#fff', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="kicker" style={{ color:c.hi }}>SUPERVISOR CONFIG · PM CHECK SHEET MASTER</div>
          <div style={{ fontSize:20, fontWeight:800 }}>ตั้งค่า JIG/FIXTURE และจุดตรวจ PM</div>
          <div style={{ fontSize:12, color:'#bbb' }}>เพิ่ม/แก้ไข/ลบ JIG, section, point of checking, standard type, range, dimension และ diameter</div>
        </div>
        <button onClick={onBack} style={topBtn}>← HOME</button>
      </div>

      <div style={{ maxWidth:1240, margin:'0 auto', padding:18, display:'grid', gridTemplateColumns:'330px 1fr', gap:14 }}>
        <aside style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="kicker">JIG MASTER · {jigList.length}</div>
            <button onClick={()=>setDraft(makeBlankJig())} style={smallHiBtn}>+ NEW</button>
          </div>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search JIG / model / process" style={inputStyle} />
          <div style={{ maxHeight:'calc(100vh - 220px)', overflow:'auto', borderTop:`1px solid ${c.line}` }}>
            {filtered.map(j => (
              <button key={j.id} onClick={()=>setDraft(normalizeJigConfig(j))} style={{
                width:'100%', textAlign:'left', border:'none', borderBottom:`1px solid ${c.line}`, padding:'10px 8px', cursor:'pointer',
                background: draft.id === j.id ? '#fff5f0' : '#fff', borderLeft:`4px solid ${draft.id === j.id ? c.hi : 'transparent'}`,
              }}>
                <div className="mono" style={{ fontSize:12, fontWeight:800 }}>{j.id}</div>
                <div className="thai" style={{ fontSize:12, fontWeight:600 }}>{j.name}</div>
                <div className="mono" style={{ fontSize:9, color:c.steel }}>{j.process} · {j.model} · {j.sections?.length || 0} SEC</div>
              </button>
            ))}
          </div>
        </aside>

        <main style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginBottom:12 }}>
            <div>
              <div className="kicker">CHECK SHEET EDITOR</div>
              <div className="mono" style={{ fontSize:18, fontWeight:800 }}>{draft.id || 'NEW JIG'} · {draft.name || 'Untitled'}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={save} style={{ ...actionBtn, background:c.ok, color:'#fff', borderColor:c.ok }}>SAVE CONFIG</button>
              <button onClick={remove} style={{ ...actionBtn, color:c.ng, borderColor:c.ng }}>DELETE</button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            <Field label="JIG ID" value={draft.id} onChange={v=>setField('id', v)} />
            <Field label="JIG/FIXTURE NAME" value={draft.name} onChange={v=>setField('name', v)} />
            <Field label="PROCESS" value={draft.process} onChange={v=>setField('process', v)} />
            <Field label="MODEL" value={draft.model} onChange={v=>setField('model', v)} />
            <Field label="PART NAME" value={draft.partName} onChange={v=>setField('partName', v)} />
            <Field label="PART NO" value={draft.partNo} onChange={v=>setField('partNo', v)} />
          </div>

          <div style={{ marginTop:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="kicker">POINT OF CHECKING · {draft.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)} POINTS</div>
            <button onClick={()=>setDraft(d=>({...d, sections:[...d.sections, makeBlankSection('checklist')]}))} style={smallHiBtn}>+ SECTION</button>
          </div>

          {draft.sections.map((section, secIdx) => (
            <section key={`${section.id}-${secIdx}`} style={{ marginTop:10, border:`1px solid ${c.line}`, background:'#fff' }}>
              <div style={{ padding:10, display:'grid', gridTemplateColumns:'120px 1fr 220px 160px auto', gap:8, alignItems:'end', background:c.paper }}>
                <Field label="SECTION ID" value={section.id} onChange={v=>setSection(secIdx, { id:v })} compact />
                <Field label="SECTION TITLE" value={section.title} onChange={v=>setSection(secIdx, { title:v })} compact />
                <div>
                  <label className="kicker">CHECK TYPE</label>
                  <select value={section.type} onChange={e=>setSection(secIdx, { type:e.target.value, standardType: inferStandardType(e.target.value), standardText: defaultStandardText(e.target.value) })} style={inputStyle}>
                    {SECTION_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="kicker">STD TYPE</label>
                  <select value={section.standardType} onChange={e=>setSection(secIdx, { standardType:e.target.value })} style={inputStyle}>
                    {STANDARD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <button onClick={()=>setDraft(d=>({...d, sections:d.sections.filter((_, i)=>i!==secIdx)}))} style={dangerMini}>DEL</button>
              </div>
              <div style={{ padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${c.line}` }}>
                <span className="mono" style={{ fontSize:10, color:c.steel }}>{sectionTypeSummary(section)} · {section.items.length} check points</span>
                <button onClick={()=>setSection(secIdx, { items:[...section.items, makeBlankPoint(section.type)] })} style={miniBtn}>+ POINT</button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#fafafa' }}>
                      {['POINT ID','LABEL / CHECK POINT','STD TYPE','NOM / Ø','MIN','MAX','UNIT','STANDARD / ATTRIBUTE',''].map(h => <th key={h} className="kicker" style={{ padding:6, textAlign:'left', borderBottom:`1px solid ${c.line}` }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((point, pointIdx) => <PointRow key={`${point.id}-${pointIdx}`} point={point} onChange={patch=>setPoint(secIdx, pointIdx, patch)} onDelete={()=>setSection(secIdx, { items:section.items.filter((_, i)=>i!==pointIdx) })} />)}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, compact = false }) {
  return <div>
    <label className="kicker">{label}</label>
    <input value={value ?? ''} onChange={e=>onChange(e.target.value)} style={{ ...inputStyle, marginBottom: compact ? 0 : 12 }} />
  </div>;
}

function PointRow({ point, onChange, onDelete }) {
  const num = key => <input type="number" step="0.01" value={point[key] ?? ''} onChange={e=>onChange({ [key]: e.target.value })} style={cellInput} />;
  return <tr>
    <td style={td}><input value={point.id || ''} onChange={e=>onChange({ id:e.target.value.toUpperCase() })} style={cellInput} /></td>
    <td style={td}><input value={point.label || ''} onChange={e=>onChange({ label:e.target.value })} style={{ ...cellInput, minWidth:190 }} /></td>
    <td style={td}><select value={point.standardType || 'attribute'} onChange={e=>onChange({ standardType:e.target.value })} style={cellInput}>{STANDARD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
    <td style={td}>{num('nom')}</td>
    <td style={td}>{num('min')}</td>
    <td style={td}>{num('max')}</td>
    <td style={td}><input value={point.unit || ''} onChange={e=>onChange({ unit:e.target.value })} style={{ ...cellInput, width:54 }} /></td>
    <td style={td}><input value={point.standardText || ''} onChange={e=>onChange({ standardText:e.target.value })} placeholder="OK/NG standard or note" style={{ ...cellInput, minWidth:190 }} /></td>
    <td style={td}><button onClick={onDelete} style={dangerMini}>DEL</button></td>
  </tr>;
}

const card = { background:'#fff', border:`1px solid ${c.line}`, padding:14 };
const inputStyle = { width:'100%', boxSizing:'border-box', padding:'8px 9px', border:`1.5px solid ${c.line}`, fontFamily:'Inter, Sarabun, system-ui', fontSize:12, background:'#fff' };
const topBtn = { padding:'8px 12px', background:c.hi, color:c.ink, border:'none', fontWeight:800, cursor:'pointer' };
const smallHiBtn = { padding:'6px 10px', background:c.hi, border:'none', fontFamily:'JetBrains Mono', fontSize:10, fontWeight:800, cursor:'pointer' };
const actionBtn = { padding:'9px 12px', background:'#fff', border:'1.5px solid', fontFamily:'JetBrains Mono', fontSize:11, fontWeight:800, cursor:'pointer' };
const miniBtn = { padding:'4px 8px', background:c.ink, color:c.hi, border:'none', fontFamily:'JetBrains Mono', fontSize:10, fontWeight:800, cursor:'pointer' };
const dangerMini = { padding:'4px 7px', background:'#fff', color:c.ng, border:`1px solid ${c.ng}`, fontFamily:'JetBrains Mono', fontSize:10, fontWeight:800, cursor:'pointer' };
const td = { padding:5, borderBottom:`1px solid ${c.line}`, verticalAlign:'top' };
const cellInput = { width:'100%', boxSizing:'border-box', padding:'5px 6px', border:`1px solid ${c.line}`, fontFamily:'Inter, Sarabun, system-ui', fontSize:11 };
