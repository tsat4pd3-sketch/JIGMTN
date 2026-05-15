import { useMemo, useState } from 'react';
import { derivePlanStatus, daysUntilDue, makePlanId, PLAN_FREQUENCIES, PLAN_PRIORITIES, summarizePlans, todayISO } from './pmPlan.js';
import { getRoster } from './auth.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', amber:'#ffb000', steel:'#6b6b6b' };

const blankPlan = () => ({
  id: makePlanId(),
  jigId: '',
  dueDate: todayISO(),
  frequency: 'monthly',
  priority: 'normal',
  assignedToEmp: '',
  engineerNote: '',
  status: 'planned',
});

export default function PMPlanningScreen({ plans, jigList, session, onBack, onSavePlan, onStartPlan }) {
  const [draft, setDraft] = useState(blankPlan());
  const [filter, setFilter] = useState('open');
  const technicians = useMemo(() => getRoster().filter(u => ['technician', 'inspector'].includes(u.role)), []);
  const stats = useMemo(() => summarizePlans(plans), [plans]);

  const rows = useMemo(() => plans
    .map(p => ({ ...p, statusView: derivePlanStatus(p), jig: jigList.find(j => j.id === p.jigId) }))
    .filter(p => filter === 'all' || (filter === 'open' ? p.statusView !== 'completed' : p.statusView === filter))
    .sort((a, b) => `${a.dueDate}`.localeCompare(`${b.dueDate}`)), [plans, jigList, filter]);

  const save = () => {
    if (!draft.jigId || !draft.dueDate || !draft.assignedToEmp) {
      alert('กรุณาเลือก JIG, Due date และช่างผู้รับผิดชอบ');
      return;
    }
    const tech = technicians.find(t => t.emp === draft.assignedToEmp);
    const jig = jigList.find(j => j.id === draft.jigId);
    onSavePlan({
      ...draft,
      jigName: jig?.name || '',
      assignedToName: tech?.name || '',
      createdByEmp: session.emp,
      createdByName: session.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setDraft(blankPlan());
  };

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui' }}>
      <div style={{ height:8, backgroundImage:`repeating-linear-gradient(-45deg, ${c.hi} 0 14px, ${c.ink} 14px 28px)` }} />
      <div style={{ background:c.ink, color:'#fff', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="kicker" style={{ color:c.hi }}>ENGINEER PM PLAN · SQL DATA</div>
          <div style={{ fontSize:20, fontWeight:800 }}>วางแผน PM JIG-FIXTURE</div>
          <div style={{ fontSize:12, color:'#bbb' }}>สร้างแผนงานให้ช่างเทคนิคตรวจตาม Due date และบันทึกผลเข้าฐานข้อมูล SQL</div>
        </div>
        <button onClick={onBack} style={{ padding:'8px 12px', background:c.hi, color:c.ink, border:'none', fontWeight:800, cursor:'pointer' }}>← HOME</button>
      </div>

      <div style={{ maxWidth:1180, margin:'0 auto', padding:18 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, marginBottom:14 }}>
          {[['OPEN', stats.planned + stats.in_progress + stats.overdue], ['OVERDUE', stats.overdue], ['PLANNED', stats.planned], ['DONE', stats.completed], ['TOTAL', stats.total]].map(([label, val]) => (
            <div key={label} style={{ background:'#fff', border:`1px solid ${c.line}`, padding:14 }}>
              <div className="kicker">{label}</div>
              <div className="mono" style={{ fontSize:26, fontWeight:800, color: label === 'OVERDUE' && val ? c.ng : c.ink }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:14 }}>
          <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16, alignSelf:'start' }}>
            <div className="kicker" style={{ marginBottom:10 }}>CREATE PM PLAN · แผนใหม่</div>
            <label className="kicker">JIG / FIXTURE</label>
            <select value={draft.jigId} onChange={e=>setDraft(d=>({...d, jigId:e.target.value}))} style={inputStyle}>
              <option value="">เลือก JIG</option>
              {jigList.map(j => <option key={j.id} value={j.id}>{j.id} · {j.name}</option>)}
            </select>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div>
                <label className="kicker">DUE DATE</label>
                <input type="date" value={draft.dueDate} onChange={e=>setDraft(d=>({...d, dueDate:e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label className="kicker">FREQUENCY</label>
                <select value={draft.frequency} onChange={e=>setDraft(d=>({...d, frequency:e.target.value}))} style={inputStyle}>
                  {PLAN_FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div>
                <label className="kicker">TECHNICIAN</label>
                <select value={draft.assignedToEmp} onChange={e=>setDraft(d=>({...d, assignedToEmp:e.target.value}))} style={inputStyle}>
                  <option value="">เลือกช่าง</option>
                  {technicians.map(t => <option key={t.emp} value={t.emp}>{t.emp} · {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="kicker">PRIORITY</label>
                <select value={draft.priority} onChange={e=>setDraft(d=>({...d, priority:e.target.value}))} style={inputStyle}>
                  {PLAN_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <label className="kicker">ENGINEER INSTRUCTION</label>
            <textarea value={draft.engineerNote} onChange={e=>setDraft(d=>({...d, engineerNote:e.target.value}))} rows={4} placeholder="เช่น จุดที่ต้องเน้น, เครื่องมือวัด, safety lockout" style={{ ...inputStyle, resize:'vertical' }} />
            <button onClick={save} style={{ width:'100%', padding:'12px', background:c.ink, color:c.hi, border:'none', fontFamily:'JetBrains Mono', fontWeight:800, cursor:'pointer' }}>＋ SAVE PLAN TO SQL</button>
          </div>

          <div style={{ background:'#fff', border:`1px solid ${c.line}`, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div className="kicker">PM PLAN BOARD · ตารางงานช่าง</div>
              <div style={{ display:'flex', gap:6 }}>
                {['open','overdue','planned','completed','all'].map(f => <button key={f} onClick={()=>setFilter(f)} style={{ ...filterBtn, background: filter===f ? c.hi : '#fff' }}>{f.toUpperCase()}</button>)}
              </div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:c.paper, borderBottom:`1.5px solid ${c.ink}` }}>
                  {['DUE','STATUS','JIG','TECHNICIAN','PLAN',''].map(h => <th key={h} className="kicker" style={{ padding:8, textAlign:'left' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const days = daysUntilDue(p);
                  return <tr key={p.id} style={{ borderBottom:`1px solid ${c.line}`, background:p.statusView==='overdue'?'#fff0f0':'#fff' }}>
                    <td className="mono" style={{ padding:8, fontWeight:800 }}>{p.dueDate}<br/><span style={{ color: days < 0 ? c.ng : c.steel, fontSize:10 }}>{days === 0 ? 'TODAY' : `${days}D`}</span></td>
                    <td style={{ padding:8 }}><span className="pill-v2" style={{ color: p.statusView==='overdue'?c.ng:p.statusView==='completed'?c.ok:c.hi }}>{p.statusView}</span></td>
                    <td style={{ padding:8 }}><strong className="mono">{p.jigId}</strong><br/><span style={{ color:c.steel }}>{p.jigName || p.jig?.name}</span></td>
                    <td style={{ padding:8 }}>{p.assignedToName}<br/><span className="mono" style={{ color:c.steel, fontSize:10 }}>{p.assignedToEmp}</span></td>
                    <td style={{ padding:8 }}><span className="mono">{p.frequency} · {p.priority}</span><br/><span className="thai" style={{ color:c.steel }}>{p.engineerNote || '—'}</span></td>
                    <td style={{ padding:8, textAlign:'right' }}>{p.statusView !== 'completed' && <button onClick={()=>onStartPlan(p)} style={{ padding:'7px 10px', background:c.ink, color:c.hi, border:'none', fontSize:11, fontWeight:800, cursor:'pointer' }}>START CHECK</button>}</td>
                  </tr>;
                })}
                {rows.length === 0 && <tr><td colSpan="6" style={{ padding:34, textAlign:'center', color:c.steel }}>ยังไม่มีแผน PM ในเงื่อนไขนี้</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width:'100%', boxSizing:'border-box', margin:'4px 0 12px', padding:'9px 10px', border:'1.5px solid #d8d4cc', fontFamily:'Inter, Sarabun, system-ui', fontSize:12, background:'#fff' };
const filterBtn = { padding:'5px 8px', border:`1px solid ${c.ink}`, fontFamily:'JetBrains Mono', fontSize:10, fontWeight:800, cursor:'pointer' };
