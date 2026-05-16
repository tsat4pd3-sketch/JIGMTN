import { useState, useRef } from 'react';
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

function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1200 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

const blankCp = (idx, x, y) => ({
  id: `CP${idx}`, label: '', type: 'dimension',
  nom: '', min: '', max: '', x, y,
});

/* ── Fixture image + check-point editor ───────────────────────── */
function FixtureImageSection({ draft, set }) {
  const [addMode,   setAddMode]   = useState(false);
  const [pending,   setPending]   = useState(null);   // { x, y } not yet confirmed
  const [editIdx,   setEditIdx]   = useState(null);   // index of cp being edited
  const [cpForm,    setCpForm]    = useState(null);   // form values while editing
  const imgRef = useRef(null);

  const cps = draft.checkPoints || [];

  /* — image upload — */
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    set('setupImage', dataUrl);
    e.target.value = '';
  };

  /* — click image to place pin — */
  const onImageClick = (e) => {
    if (!addMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const nextIdx = cps.length + 1;
    setPending({ x, y });
    setEditIdx('new');
    setCpForm(blankCp(nextIdx, x, y));
    setAddMode(false);
  };

  /* — click existing pin — */
  const onPinClick = (e, idx) => {
    e.stopPropagation();
    setEditIdx(idx);
    setCpForm({ ...cps[idx] });
    setPending(null);
  };

  /* — save form — */
  const saveForm = () => {
    if (!cpForm.label.trim()) { alert('กรุณากรอก Label'); return; }
    let next;
    if (editIdx === 'new') {
      next = [...cps, { ...cpForm }];
    } else {
      next = cps.map((cp, i) => i === editIdx ? { ...cpForm } : cp);
    }
    set('checkPoints', next);
    cancelForm();
  };

  const cancelForm = () => { setEditIdx(null); setCpForm(null); setPending(null); };

  const deletePin = (idx) => {
    const next = cps.filter((_, i) => i !== idx).map((cp, i) => ({ ...cp, id:`CP${i+1}` }));
    set('checkPoints', next);
    if (editIdx === idx) cancelForm();
  };

  const setF = (k, v) => setCpForm(f => ({ ...f, [k]: v }));

  const pinColors = [c.hi, '#1d4ed8', c.ok, '#7c3aed', c.ng, c.amber, '#0891b2', '#c026d3'];
  const pinColor  = (i) => pinColors[i % pinColors.length];

  return (
    <div style={{ marginTop:16, borderTop:`2px dashed ${c.hi}`, paddingTop:14 }}>
      <div className="kicker" style={{ color:c.hi, marginBottom:12 }}>
        FIXTURE IMAGE &amp; CHECK POINTS · ภาพ Fixture และจุดตรวจ
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

        {/* ── Left: image canvas ─────────────────────────────── */}
        <div>
          {/* Upload bar */}
          <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
            <label style={{
              padding:'5px 12px', background:c.ink, color:c.hi,
              fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
            }}>
              ↑ UPLOAD IMAGE
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={onFileChange} />
            </label>
            {draft.setupImage && (
              <button onClick={()=>set('setupImage',null)} style={{
                padding:'5px 10px', background:'transparent', color:c.ng, border:`1.5px solid ${c.ng}`,
                fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
              }}>✕ REMOVE</button>
            )}
            {draft.setupImage && (
              <button onClick={()=>{ setAddMode(a=>!a); cancelForm(); }} style={{
                padding:'5px 12px',
                background: addMode ? c.hi : '#fff',
                color: addMode ? c.ink : c.ink,
                border:`1.5px solid ${addMode ? c.hi : c.ink}`,
                fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
              }}>{addMode ? '● CLICK IMAGE TO PIN' : '＋ ADD POINT'}</button>
            )}
          </div>

          {/* Image + pins */}
          {draft.setupImage ? (
            <div
              style={{
                position:'relative', background:c.paper, border:`1.5px solid ${c.line}`,
                cursor: addMode ? 'crosshair' : 'default', userSelect:'none',
              }}
              onClick={onImageClick}
              ref={imgRef}
            >
              <img
                src={draft.setupImage}
                alt="fixture"
                style={{ width:'100%', display:'block', pointerEvents:'none' }}
              />
              {/* confirmed pins */}
              {cps.map((cp, i) => (
                <div key={cp.id} onClick={e => onPinClick(e, i)} style={{
                  position:'absolute',
                  left: `calc(${cp.x*100}% - 12px)`,
                  top:  `calc(${cp.y*100}% - 12px)`,
                  width:24, height:24, borderRadius:'50%',
                  background: pinColor(i), color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700,
                  border:`2px solid #fff`,
                  boxShadow:'0 1px 4px rgba(0,0,0,0.5)',
                  cursor:'pointer', zIndex:2,
                  outline: editIdx===i ? `3px solid ${c.ink}` : 'none',
                }}>
                  {i+1}
                </div>
              ))}
              {/* pending pin (placed but not yet saved) */}
              {pending && (
                <div style={{
                  position:'absolute',
                  left: `calc(${pending.x*100}% - 12px)`,
                  top:  `calc(${pending.y*100}% - 12px)`,
                  width:24, height:24, borderRadius:'50%',
                  background:'#fff', border:`2px dashed ${c.ink}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, color:c.ink,
                  boxShadow:'0 1px 4px rgba(0,0,0,0.4)', zIndex:3,
                }}>?</div>
              )}
              {addMode && (
                <div style={{
                  position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)',
                  padding:'3px 10px', background:'rgba(0,0,0,0.65)', color:c.hi,
                  fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, pointerEvents:'none',
                }}>คลิกเพื่อวางจุดตรวจ</div>
              )}
            </div>
          ) : (
            <label style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              height:180, background:c.paper, border:`2px dashed ${c.line}`, cursor:'pointer',
              color:c.steel, fontFamily:'JetBrains Mono', fontSize:10, gap:8,
            }}>
              <span style={{ fontSize:32 }}>🖼</span>
              <span>UPLOAD FIXTURE IMAGE</span>
              <span style={{ fontSize:9, color:c.line }}>JPG / PNG / WEBP</span>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={onFileChange} />
            </label>
          )}
        </div>

        {/* ── Right: check-point list + form ─────────────────── */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="kicker">CHECK POINTS · จุดตรวจ ({cps.length})</div>
          </div>

          {/* Inline form (add new or edit existing) */}
          {cpForm && (
            <div style={{ background:'#fff', border:`2px solid ${c.hi}`, padding:10, marginBottom:10 }}>
              <div className="kicker" style={{ color:c.hi, marginBottom:8 }}>
                {editIdx==='new' ? `NEW · CP${cps.length+1}` : `EDIT · ${cps[editIdx]?.id}`}
              </div>
              <Field label="LABEL · ชื่อจุดตรวจ">
                <input value={cpForm.label} onChange={e=>setF('label',e.target.value)}
                  placeholder="เช่น Locate Pin Front, Air Clamp 1"
                  style={{ width:'100%', padding:'5px 7px', border:`1.5px solid ${c.hi}`, fontSize:11, boxSizing:'border-box' }} />
              </Field>
              <Field label="TYPE · ประเภทการตรวจ">
                <div style={{ display:'flex', gap:6 }}>
                  {[['dimension','📐 DIMENSION'],['attribute','✓ ATTRIBUTE']].map(([v,l])=>(
                    <button key={v} onClick={()=>setF('type',v)} style={{
                      flex:1, padding:'6px 4px',
                      background: cpForm.type===v ? c.ink : '#fff',
                      color:      cpForm.type===v ? c.hi  : c.ink,
                      border:`1.5px solid ${cpForm.type===v ? c.ink : c.line}`,
                      fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
                    }}>{l}</button>
                  ))}
                </div>
              </Field>
              {cpForm.type==='dimension' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[['nom','NOM (mm)'],['min','MIN'],['max','MAX']].map(([k,l])=>(
                    <Field key={k} label={l}>
                      <input type="number" step="0.01" value={cpForm[k]}
                        onChange={e=>setF(k,e.target.value)}
                        style={{ width:'100%', padding:'5px 6px', border:`1.5px solid ${c.hi}`, fontFamily:'JetBrains Mono', fontSize:11, boxSizing:'border-box' }} />
                    </Field>
                  ))}
                </div>
              )}
              {cpForm.type==='attribute' && (
                <div style={{ padding:'6px 8px', background:'#f0fdf4', border:`1px solid ${c.ok}`, fontSize:10, fontFamily:'JetBrains Mono', color:c.ok, marginTop:4 }}>
                  ตรวจสอบแบบ OK / NG
                </div>
              )}
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                <button onClick={cancelForm} style={{ flex:1, padding:'6px', background:'transparent', border:`1.5px solid ${c.line}`, fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer', color:c.steel }}>CANCEL</button>
                <button onClick={saveForm}   style={{ flex:2, padding:'6px', background:c.ok, color:'#fff', border:'none', fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer' }}>✓ SAVE POINT</button>
              </div>
            </div>
          )}

          {/* List */}
          {cps.length === 0 && !cpForm && (
            <div style={{ padding:20, textAlign:'center', color:c.line, fontFamily:'JetBrains Mono', fontSize:10, border:`1px dashed ${c.line}` }}>
              {draft.setupImage ? 'กด ＋ ADD POINT แล้วคลิกบนรูป' : 'Upload รูปก่อนเพื่อวางจุดตรวจ'}
            </div>
          )}
          {cps.map((cp, i) => (
            <div key={cp.id} style={{
              display:'flex', gap:8, alignItems:'flex-start',
              padding:'8px 10px', marginBottom:4,
              background: editIdx===i ? '#fff5f0' : '#fff',
              border:`1.5px solid ${editIdx===i ? c.hi : c.line}`,
              cursor:'pointer',
            }} onClick={()=>{ setEditIdx(i); setCpForm({...cp}); setPending(null); }}>
              <div style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                background:pinColor(i), color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700,
              }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:12 }}>{cp.label || <span style={{ color:c.line }}>—</span>}</div>
                {cp.type==='dimension' ? (
                  <div className="mono" style={{ fontSize:9, color:c.steel, marginTop:1 }}>
                    📐 {cp.nom||'?'} mm · {cp.min||'?'}–{cp.max||'?'}
                  </div>
                ) : (
                  <div className="mono" style={{ fontSize:9, color:c.ok, marginTop:1 }}>✓ OK / NG</div>
                )}
              </div>
              <button onClick={e=>{ e.stopPropagation(); deletePin(i); }} style={{
                padding:'2px 7px', background:'transparent', color:c.ng, border:`1px solid ${c.ng}`,
                fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, cursor:'pointer', flexShrink:0,
              }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

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
      setupImage:   s.setupImage   ?? null,
      checkPoints:  s.checkPoints  ?? [],
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
    const out = enriched.map(j => {
      const s = { ...(setup[j.id]||{}) };
      delete s.setupImage; // omit binary data from export
      return { id:j.id, name:j.name, ...s };
    });
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

                          {/* 4M grid */}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:16 }}>

                            {/* ① MAN */}
                            <MCard title="MAN · คน" accent="#1d4ed8" bg="#eff6ff">
                              <Field label="RESPONSIBLE · ผู้รับผิดชอบ">
                                <select value={draft.responsible} onChange={e=>set('responsible',e.target.value)} style={selStyle}>
                                  <option value="">— ยังไม่ระบุ —</option>
                                  {inspectors.map(u => <option key={u.emp} value={u.emp}>{u.emp} · {u.name}</option>)}
                                </select>
                              </Field>
                              <Field label="SUPERVISOR · หัวหน้า">
                                <select value={draft.supervisor} onChange={e=>set('supervisor',e.target.value)} style={selStyle}>
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

                          {/* ⑤ Fixture image + check points */}
                          <FixtureImageSection draft={draft} set={set} />

                          {/* Action buttons */}
                          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
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
