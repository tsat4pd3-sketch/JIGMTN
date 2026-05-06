import { useState } from 'react';
import { getRoster, saveRoster } from './auth.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', steel:'#6b6b6b' };

export default function AdminScreen({ onBack }) {
  const [roster, setRoster] = useState(getRoster());
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const startNew = () => {
    setDraft({ emp:'', name:'', pin:'', role:'inspector', shift:'A' });
    setEditingId('NEW');
  };
  const startEdit = (u) => { setDraft({...u}); setEditingId(u.emp); };
  const cancel = () => { setDraft(null); setEditingId(null); };
  const save = () => {
    if (!draft.emp || !draft.name || draft.pin.length<4) { alert('กรอกข้อมูลให้ครบ (PIN ต้อง 4 หลัก)'); return; }
    let next;
    if (editingId === 'NEW') next = [...roster, draft];
    else next = roster.map(u => u.emp===editingId ? draft : u);
    setRoster(next); saveRoster(next); cancel();
  };
  const remove = (emp) => {
    if (!confirm(`ลบ ${emp}?`)) return;
    const next = roster.filter(u => u.emp!==emp);
    setRoster(next); saveRoster(next);
  };
  const exportRoster = () => {
    const blob = new Blob([JSON.stringify(roster, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'roster.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const clearLocal = () => {
    if (!confirm('ล้างข้อมูล cache + queue ทั้งหมดในเครื่องนี้?')) return;
    ['pm_jig_v3','pm_jig_cache_v2','pm_jig_queue_v2'].forEach(k=>localStorage.removeItem(k));
    alert('ล้างเรียบร้อย — รีเฟรชหน้าเพื่อดึงข้อมูลใหม่');
  };

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui' }}>
      <div className="hazard" style={{ height:6 }} />
      <div style={{ background:c.ink, color:'#fff', padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="kicker" style={{ color:c.hi }}>ADMIN · ระบบจัดการ</div>
          <div style={{ fontSize:18, fontWeight:700 }}>User Roster & System</div>
        </div>
        <button onClick={onBack} style={{ padding:'6px 12px', background:'transparent', color:'#fff', border:'1.5px solid #fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>← BACK</button>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:20 }}>
        <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="kicker">USER ROSTER · {roster.length} accounts</div>
            <button onClick={startNew} style={{ padding:'6px 12px', background:c.hi, border:'none', fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>+ ADD USER</button>
          </div>

          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:c.paper, borderBottom:`1.5px solid ${c.ink}` }}>
                {['EMP','NAME','PIN','ROLE','SHIFT',''].map(h=>(
                  <th key={h} className="kicker" style={{ padding:'8px', textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editingId==='NEW' && <EditRow draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />}
              {roster.map(u => editingId===u.emp
                ? <EditRow key={u.emp} draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
                : (
                  <tr key={u.emp} style={{ borderBottom:`1px solid ${c.line}` }}>
                    <td className="mono" style={{ padding:'8px', fontWeight:700 }}>{u.emp}</td>
                    <td className="thai" style={{ padding:'8px' }}>{u.name}</td>
                    <td className="mono" style={{ padding:'8px' }}>{'•'.repeat(u.pin.length)}</td>
                    <td style={{ padding:'8px' }}>
                      <span className="pill-v2" style={{
                        color: u.role==='admin' ? c.ng : u.role==='supervisor' ? c.hi : c.ok,
                      }}>{u.role}</span>
                    </td>
                    <td className="mono" style={{ padding:'8px' }}>{u.shift}</td>
                    <td style={{ padding:'8px', textAlign:'right' }}>
                      <button onClick={()=>startEdit(u)} style={{ marginRight:4, padding:'4px 8px', background:'transparent', border:`1px solid ${c.ink}`, fontSize:10, cursor:'pointer' }}>EDIT</button>
                      <button onClick={()=>remove(u.emp)} style={{ padding:'4px 8px', background:c.ng, color:'#fff', border:'none', fontSize:10, cursor:'pointer' }}>DEL</button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16 }}>
          <div className="kicker" style={{ marginBottom:10 }}>SYSTEM · เครื่องมือ</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={exportRoster} style={{ padding:'8px 14px', background:c.ink, color:'#fff', border:'none', fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>↓ EXPORT ROSTER</button>
            <button onClick={clearLocal} style={{ padding:'8px 14px', background:'#fff', color:c.ng, border:`1.5px solid ${c.ng}`, fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>⚠ CLEAR LOCAL CACHE</button>
            <button onClick={()=>{ if(confirm('Reset roster to defaults?')){ localStorage.removeItem('pm_jig_roster_v2'); location.reload(); } }} style={{ padding:'8px 14px', background:'#fff', color:c.ink, border:`1.5px solid ${c.ink}`, fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer' }}>↺ RESET ROSTER</button>
          </div>
          <div style={{ marginTop:14, paddingTop:14, borderTop:`1px dashed ${c.line}`, fontSize:11, color:c.steel, lineHeight:1.7 }}>
            <strong>หมายเหตุ:</strong> ระบบนี้เก็บ roster ใน localStorage ของแต่ละเครื่อง — สำหรับ production แนะนำให้ย้ายไป LDAP / Active Directory<br/>
            <strong>Data:</strong> PM records เก็บใน GitHub Issues ของ repo · cache + offline queue เก็บใน localStorage
          </div>
        </div>
      </div>
    </div>
  );
}

function EditRow({ draft, setDraft, onSave, onCancel }) {
  const inp = (k, w='100%', maxLen) => (
    <input value={draft[k]} maxLength={maxLen} onChange={e=>setDraft(d=>({...d, [k]: k==='emp' ? e.target.value.toUpperCase() : e.target.value}))}
      style={{ width:w, padding:'4px 6px', border:`1.5px solid ${c.hi}`, fontFamily:'inherit', fontSize:11 }} />
  );
  return (
    <tr style={{ background:'#fff5f0' }}>
      <td style={{ padding:'6px' }}>{inp('emp', 110, 12)}</td>
      <td style={{ padding:'6px' }}>{inp('name', 160)}</td>
      <td style={{ padding:'6px' }}>{inp('pin', 60, 6)}</td>
      <td style={{ padding:'6px' }}>
        <select value={draft.role} onChange={e=>setDraft(d=>({...d, role:e.target.value}))} style={{ padding:'4px', fontSize:11 }}>
          <option value="inspector">inspector</option>
          <option value="supervisor">supervisor</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td style={{ padding:'6px' }}>
        <select value={draft.shift} onChange={e=>setDraft(d=>({...d, shift:e.target.value}))} style={{ padding:'4px', fontSize:11 }}>
          <option>A</option><option>B</option><option>C</option><option>-</option>
        </select>
      </td>
      <td style={{ padding:'6px', textAlign:'right' }}>
        <button onClick={onSave} style={{ marginRight:4, padding:'4px 8px', background:c.ok, color:'#fff', border:'none', fontSize:10, cursor:'pointer' }}>SAVE</button>
        <button onClick={onCancel} style={{ padding:'4px 8px', background:'transparent', border:`1px solid ${c.steel}`, fontSize:10, cursor:'pointer' }}>×</button>
      </td>
    </tr>
  );
}
