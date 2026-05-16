import { useState } from 'react';
import { getRoster } from './auth.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', steel:'#6b6b6b', amber:'#ffb000' };
const SETUP_KEY = 'pm_jig_setup_v1';

function loadSetup() {
  try { const s = localStorage.getItem(SETUP_KEY); if (s) return JSON.parse(s); } catch(_) {}
  return {};
}
function saveSetup(s) { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); }

function sectionCounts(jig) {
  const r = { LP:0, SD:0, AC:0, PS:0 };
  (jig.sections||[]).forEach(s => {
    if (s.type==='locatepin_simple'||s.type==='locatepin_xy') r.LP += s.items.length;
    if (s.type==='feeler') r.SD += s.items.length;
    if (s.id==='ac') r.AC += s.items.length;
    if (s.id==='ps') r.PS += s.items.length;
  });
  return r;
}

export default function JigSetupScreen({ jigList, onBack }) {
  const [setup, setSetup]       = useState(loadSetup);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [expandedId, setExpId]  = useState(null);
  const [draft, setDraft]       = useState(null);

  const roster = getRoster();

  const enriched = jigList.map(j => ({
    ...j,
    ...(setup[j.id] || {}),
    activeStatus: setup[j.id]?.activeStatus ?? true,
  }));

  const filtered = enriched.filter(j => {
    if (filter==='active'   && !j.activeStatus) return false;
    if (filter==='inactive' &&  j.activeStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.id.toLowerCase().includes(q) || j.name.toLowerCase().includes(q) || (j.partNo||'').toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount   = enriched.filter(j => j.activeStatus).length;
  const inactiveCount = enriched.length - activeCount;
  const modelCount    = new Set(enriched.map(j => j.model)).size;

  const startEdit = (j) => {
    if (expandedId === j.id) { setExpId(null); setDraft(null); return; }
    setExpId(j.id);
    const s = setup[j.id] || {};
    setDraft({
      sn:           s.sn           ?? '',
      location:     s.location     ?? 'LINE 061',
      station:      s.station      ?? '',
      activeStatus: s.activeStatus ?? true,
      pmInterval:   s.pmInterval   ?? 30,
      refDoc:       s.refDoc       ?? '',
      setupNote:    s.setupNote    ?? '',
      responsible:  s.responsible  ?? '',
      supervisor:   s.supervisor   ?? '',
    });
  };

  const doSave = (jigId) => {
    const next = { ...setup, [jigId]: { ...draft } };
    setSetup(next); saveSetup(next);
    setExpId(null); setDraft(null);
  };

  const cancel = () => { setExpId(null); setDraft(null); };
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const exportSetup = () => {
    const out = enriched.map(j => ({ id:j.id, name:j.name, ...(setup[j.id]||{}) }));
    const blob = new Blob([JSON.stringify(out, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='jig-4m-setup.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui' }}>
      <div className="hazard" style={{ height:6 }} />

      {/* Header */}
      <div style={{ background:c.ink, color:'#fff', padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="kicker" style={{ color:c.hi }}>JIG SETUP · 4M MANAGEMENT · LINE 061</div>
          <div style={{ fontSize:18, fontWeight:700 }}>Jig Master Register · ทะเบียนจิ๊ก</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={exportSetup} style={{ padding:'6px 12px', background:'transparent', color:c.hi, border:`1.5px solid ${c.hi}`, fontSize:11, fontWeight:700, cursor:'pointer' }}>↓ EXPORT</button>
          <button onClick={onBack}      style={{ padding:'6px 12px', background:'transparent', color:'#fff', border:'1.5px solid #fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>← BACK</button>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:20 }}>

        {/* KPI tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          <KPI label="TOTAL JIGS" sub="จิ๊กทั้งหมด"  value={enriched.length} accent={c.ink} />
          <KPI label="ACTIVE"     sub="ใช้งาน"        value={activeCount}     accent={c.ok} />
          <KPI label="INACTIVE"   sub="พักใช้งาน"     value={inactiveCount}   accent={c.steel} />
          <KPI label="MODELS"     sub="รุ่นรถ"         value={modelCount}      accent={c.hi} />
        </div>

        {/* Filter + Search */}
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
          {[['all','ALL'],['active','ACTIVE'],['inactive','INACTIVE']].map(([k,l]) => (
            <button key={k} onClick={()=>setFilter(k)} style={{
              padding:'6px 14px', background:filter===k ? c.ink : '#fff',
              color:filter===k ? c.hi : c.ink, border:`1.5px solid ${c.ink}`,
              fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>{l}</button>
          ))}
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหา JIG ID / ชื่อ / Part No..."
            style={{ flex:1, maxWidth:320, padding:'6px 10px', border:`1.5px solid ${c.line}`, fontFamily:'JetBrains Mono', fontSize:11 }}
          />
          <span style={{ marginLeft:'auto', fontFamily:'JetBrains Mono', fontSize:10, color:c.steel }}>
            {filtered.length} / {enriched.length}
          </span>
        </div>

        {/* Table */}
        <div style={{ background:'#fff', border:`1px solid ${c.line}` }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:c.paper, borderBottom:`1.5px solid ${c.ink}` }}>
                {['JIG ID','NAME · ชื่อ','PROCESS','PART NO','S/N','LOCATION','PM CYCLE','STATUS','4M SETUP'].map(h => (
                  <th key={h} className="kicker" style={{ padding:'8px 10px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap(j => {
                const isExpanded = expandedId === j.id;
                const counts     = sectionCounts(j);
                const countStr   = [counts.LP&&`LP×${counts.LP}`, counts.SD&&`SD×${counts.SD}`, counts.AC&&`AC×${counts.AC}`, counts.PS&&`PS×${counts.PS}`].filter(Boolean).join('  ');
                const rows = [
                  <tr key={j.id} style={{
                    borderBottom: isExpanded ? `2px solid ${c.hi}` : `1px solid ${c.line}`,
                    background:   isExpanded ? '#fff8f5' : j.activeStatus ? '#fff' : '#fafafa',
                  }}>
                    <td className="mono" style={{ padding:'10px', fontWeight:700 }}>{j.id}</td>
                    <td style={{ padding:'10px' }}>
                      <div style={{ fontWeight:600, fontSize:12 }}>{j.name}</div>
                      <div className="mono" style={{ fontSize:9, color:c.steel, marginTop:1 }}>{countStr}</div>
                    </td>
                    <td className="mono" style={{ padding:'10px', fontSize:10, color:c.steel }}>{j.process}</td>
                    <td className="mono" style={{ padding:'10px', fontSize:10 }}>{j.partNo||'—'}</td>
                    <td className="mono" style={{ padding:'10px', fontSize:10, color: j.sn ? c.ink : c.line }}>{j.sn||'—'}</td>
                    <td className="mono" style={{ padding:'10px', fontSize:10 }}>
                      {j.location||'—'}{j.station && <span style={{ color:c.steel }}> / {j.station}</span>}
                    </td>
                    <td className="mono" style={{ padding:'10px', fontWeight:700 }}>
                      {j.pmInterval ? `${j.pmInterval}D` : '—'}
                    </td>
                    <td style={{ padding:'10px' }}>
                      <span className="pill-v2" style={{
                        color:        j.activeStatus ? c.ok    : c.steel,
                        borderColor:  j.activeStatus ? c.ok    : c.line,
                        background:   j.activeStatus ? '#e7f3e8' : c.paper,
                      }}>{j.activeStatus ? 'ACTIVE' : 'INACTIVE'}</span>
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <button onClick={()=>startEdit(j)} style={{
                        padding:'4px 10px',
                        background: isExpanded ? c.hi : 'transparent',
                        border:`1.5px solid ${isExpanded ? c.hi : c.ink}`,
                        fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
                      }}>{isExpanded ? '▲ CLOSE' : '▼ EDIT 4M'}</button>
                    </td>
                  </tr>,
                ];

                if (isExpanded && draft) {
                  const inspectors = roster.filter(u => ['inspector','supervisor','admin'].includes(u.role));
                  const supervisors = roster.filter(u => ['supervisor','admin'].includes(u.role));
                  const respUser   = roster.find(u => u.emp === draft.responsible);

                  rows.push(
                    <tr key={`${j.id}-4m`} style={{ borderBottom:`1px solid ${c.line}` }}>
                      <td colSpan={9} style={{ padding:0 }}>
                        <div style={{ padding:16, background:'#fff8f5', borderTop:`3px solid ${c.hi}` }}>
                          <div className="kicker" style={{ color:c.hi, marginBottom:14 }}>4M SETUP · {j.id} — {j.name}</div>

                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:16 }}>

                            {/* ① MAN */}
                            <MCard title="MAN · คน" accent="#1d4ed8" bg="#eff6ff">
                              <Field label="RESPONSIBLE · ผู้รับผิดชอบ">
                                <select value={draft.responsible} onChange={e=>set('responsible',e.target.value)}
                                  style={selStyle}>
                                  <option value="">— ยังไม่ระบุ —</option>
                                  {inspectors.map(u => <option key={u.emp} value={u.emp}>{u.emp} · {u.name}</option>)}
                                </select>
                              </Field>
                              <Field label="SUPERVISOR · หัวหน้า">
                                <select value={draft.supervisor} onChange={e=>set('supervisor',e.target.value)}
                                  style={selStyle}>
                                  <option value="">— ยังไม่ระบุ —</option>
                                  {supervisors.map(u => <option key={u.emp} value={u.emp}>{u.emp} · {u.name}</option>)}
                                </select>
                              </Field>
                              {respUser && (
                                <div style={{ marginTop:8, padding:'6px 8px', background:'#dbeafe', fontSize:10, fontFamily:'JetBrains Mono', color:'#1d4ed8', lineHeight:1.7 }}>
                                  <div style={{ fontWeight:700 }}>{respUser.name}</div>
                                  <div style={{ opacity:0.8 }}>{respUser.emp} · SHIFT {respUser.shift}</div>
                                </div>
                              )}
                            </MCard>

                            {/* ② MACHINE */}
                            <MCard title="MACHINE · เครื่อง" accent={c.hi} bg="#fff8f5">
                              <Field label="SERIAL No.">
                                <input value={draft.sn} placeholder="JIG-SN-XXXXX"
                                  onChange={e=>set('sn',e.target.value)} style={inpStyle} />
                              </Field>
                              <Field label="LOCATION">
                                <input value={draft.location} placeholder="LINE 061 / BAY-A"
                                  onChange={e=>set('location',e.target.value)} style={inpStyle} />
                              </Field>
                              <Field label="STATION">
                                <input value={draft.station} placeholder="ST-01"
                                  onChange={e=>set('station',e.target.value)} style={inpStyle} />
                              </Field>
                              <Field label="STATUS">
                                <div style={{ display:'flex', gap:6 }}>
                                  {[true,false].map(v => (
                                    <button key={String(v)} onClick={()=>set('activeStatus',v)} style={{
                                      flex:1, padding:'5px',
                                      border:`1.5px solid ${draft.activeStatus===v ? (v?c.ok:c.ng) : c.line}`,
                                      background: draft.activeStatus===v ? (v?'#e7f3e8':'#fff5f0') : '#fff',
                                      color: draft.activeStatus===v ? (v?c.ok:c.ng) : c.steel,
                                      fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
                                    }}>{v?'ACTIVE':'INACTIVE'}</button>
                                  ))}
                                </div>
                              </Field>
                              {countStr && (
                                <div style={{ marginTop:6, padding:'4px 6px', background:'rgba(0,0,0,0.04)', fontSize:9, fontFamily:'JetBrains Mono', color:c.steel }}>
                                  {countStr}
                                </div>
                              )}
                            </MCard>

                            {/* ③ MATERIAL */}
                            <MCard title="MATERIAL · วัสดุ" accent={c.ok} bg="#f0fdf4">
                              <InfoRow label="PART NAME">{j.partName||'—'}</InfoRow>
                              <InfoRow label="PART No.">{j.partNo||'—'}</InfoRow>
                              <InfoRow label="MODEL">{j.model||'—'}</InfoRow>
                              <InfoRow label="PROCESS">{j.process||'—'}</InfoRow>
                              <div style={{ marginTop:8, fontSize:9, color:c.steel, fontFamily:'JetBrains Mono' }}>
                                Read-only · ข้อมูลจาก JIG Master
                              </div>
                            </MCard>

                            {/* ④ METHOD */}
                            <MCard title="METHOD · วิธีการ" accent={c.amber} bg="#fffbeb">
                              <Field label="PM INTERVAL (DAYS) · รอบ PM">
                                <input type="number" min={1} value={draft.pmInterval}
                                  onChange={e=>set('pmInterval', Math.max(1, parseInt(e.target.value)||1))}
                                  style={{ ...inpStyle, fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700 }} />
                              </Field>
                              <Field label="REF. DOC · เอกสารอ้างอิง">
                                <input value={draft.refDoc} placeholder="WI-JIG-XXX"
                                  onChange={e=>set('refDoc',e.target.value)} style={inpStyle} />
                              </Field>
                              <Field label="SETUP NOTES · หมายเหตุ">
                                <textarea value={draft.setupNote} rows={3}
                                  placeholder="ขั้นตอน / ข้อควรระวัง..."
                                  onChange={e=>set('setupNote',e.target.value)}
                                  style={{ ...inpStyle, fontFamily:'Sarabun, system-ui', resize:'vertical' }} />
                              </Field>
                            </MCard>

                          </div>

                          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                            <button onClick={cancel} style={{ padding:'8px 16px', background:'#fff', color:c.steel, border:`1.5px solid ${c.line}`, fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>× CANCEL</button>
                            <button onClick={()=>doSave(j.id)} style={{ padding:'8px 20px', background:c.ok, color:'#fff', border:'none', fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>✓ SAVE 4M DATA</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inpStyle = { width:'100%', padding:'5px 7px', border:`1.5px solid #ff6a00`, fontSize:11, boxSizing:'border-box' };
const selStyle = { width:'100%', padding:'5px 7px', border:`1.5px solid #ff6a00`, fontSize:11, boxSizing:'border-box' };

const KPI = ({ label, sub, value, accent }) => (
  <div style={{ background:'#fff', border:`1px solid #d8d4cc`, borderLeft:`3px solid ${accent}`, padding:'14px 16px' }}>
    <div className="kicker">{label}</div>
    <div className="mono" style={{ fontSize:30, fontWeight:700, lineHeight:1, marginTop:4 }}>{value}</div>
    <div className="thai" style={{ fontSize:11, color:'#6b6b6b', marginTop:4 }}>{sub}</div>
  </div>
);

const MCard = ({ title, accent, bg, children }) => (
  <div style={{ background:bg, border:`1.5px solid ${accent}`, padding:12 }}>
    <div style={{ fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, color:accent, letterSpacing:'0.1em', marginBottom:10 }}>{title}</div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom:8 }}>
    <div className="kicker" style={{ marginBottom:3 }}>{label}</div>
    {children}
  </div>
);

const InfoRow = ({ label, children }) => (
  <div style={{ marginBottom:6 }}>
    <div className="kicker">{label}</div>
    <div style={{ fontWeight:600, fontSize:11, marginTop:1 }}>{children}</div>
  </div>
);
