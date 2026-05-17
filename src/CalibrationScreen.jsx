import { useState } from 'react';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', ok:'#2f7d32', steel:'#6b6b6b', amber:'#ffb000' };

const CAL_KEY = 'pm_jig_cal_v2';

const DEFAULT_TOOLS = [
  { id:'TRQ-0214', name:'Torque Wrench 40-200 N·m', th:'ประแจวัดแรงบิด', cat:'TORQUE', loc:'BAY-A 12', interval:180, lastCal:offsetDate(-2), sn:'SK-TW-0214' },
  { id:'CAL-0089', name:'Vernier Caliper 200mm',     th:'เวอร์เนีย 200มม',  cat:'MEASURE', loc:'BAY-A 04', interval:365, lastCal:offsetDate(-310), sn:'MTY-VC-0089' },
  { id:'MIC-0033', name:'Micrometer 0-25mm',         th:'ไมโครมิเตอร์',     cat:'MEASURE', loc:'BAY-A 05', interval:365, lastCal:offsetDate(-380), sn:'MTY-MM-0033' },
  { id:'GAU-0042', name:'Feeler Gauge Set',          th:'ฟิลเลอร์เกจ',      cat:'MEASURE', loc:'BAY-A 06', interval:365, lastCal:offsetDate(-15), sn:'STA-FG-0042' },
  { id:'IMP-0061', name:'Impact Wrench 1/2"',        th:'ประแจลม',          cat:'POWER',   loc:'BAY-C 15', interval:730, lastCal:offsetDate(-100), sn:'CHI-IW-0061' },
  { id:'DRL-0117', name:'Cordless Drill 18V',        th:'สว่านไร้สาย',       cat:'POWER',   loc:'BAY-C 21', interval:730, lastCal:offsetDate(-200), sn:'MAK-CD-0117' },
];

function offsetDate(d) {
  const date = new Date(); date.setDate(date.getDate() + d);
  return date.toISOString().slice(0,10);
}
function daysUntil(date, intervalDays) {
  const last = new Date(date+'T00:00:00').getTime();
  const due = last + intervalDays*86400000;
  return Math.floor((due - Date.now()) / 86400000);
}

function loadTools() {
  try { const s = localStorage.getItem(CAL_KEY); if (s) return JSON.parse(s); } catch(_) {}
  localStorage.setItem(CAL_KEY, JSON.stringify(DEFAULT_TOOLS));
  return DEFAULT_TOOLS;
}
function saveTools(tools) { localStorage.setItem(CAL_KEY, JSON.stringify(tools)); }

export default function CalibrationScreen({ canEdit, onBack }) {
  const [tools, setTools] = useState(loadTools());
  const [filter, setFilter] = useState('all');

  const enriched = tools.map(t => {
    const d = daysUntil(t.lastCal, t.interval);
    return { ...t, daysLeft: d, status: d < 0 ? 'overdue' : d < 30 ? 'due' : 'ok' };
  });

  const list = enriched.filter(t => filter==='all' || t.status===filter);
  const overdue = enriched.filter(t=>t.status==='overdue').length;
  const due = enriched.filter(t=>t.status==='due').length;

  const recordCal = (id) => {
    if (!canEdit) return;
    if (!confirm('บันทึก Calibration วันนี้?')) return;
    const today = new Date().toISOString().slice(0,10);
    const next = tools.map(t => t.id===id ? {...t, lastCal: today} : t);
    setTools(next); saveTools(next);
  };

  return (
    <div style={{ minHeight:'100vh', background:c.paper, fontFamily:'Inter, system-ui' }}>
      <div className="hazard" style={{ height:6 }} />
      <div style={{ background:c.ink, color:'#fff', padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="kicker" style={{ color:c.hi }}>TOOL CALIBRATION · สอบเทียบเครื่องมือ</div>
          <div style={{ fontSize:18, fontWeight:700 }}>Calibration Register</div>
        </div>
        <button onClick={onBack} style={{ padding:'6px 12px', background:'transparent', color:'#fff', border:'1.5px solid #fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>← BACK</button>
      </div>

      <div className="screen-pad" style={{ maxWidth:1200, margin:'0 auto' }}>
        <div className="grid-kpi-3">
          <KPI label="OVERDUE" sub="เกินกำหนดสอบเทียบ" value={overdue} accent={c.ng} />
          <KPI label="DUE 30D" sub="ครบกำหนด 30 วัน" value={due} accent={c.amber} />
          <KPI label="VALID" sub="พร้อมใช้งาน" value={tools.length-overdue-due} accent={c.ok} />
        </div>

        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
          {[['all','ALL'],['overdue','OVERDUE'],['due','DUE'],['ok','VALID']].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{
              padding:'6px 12px', background: filter===k ? c.ink : '#fff',
              color: filter===k ? c.hi : c.ink, border:`1.5px solid ${c.ink}`,
              fontFamily:'JetBrains Mono', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>{l}</button>
          ))}
        </div>

        <div style={{ background:'#fff', border:`1px solid ${c.line}` }}>
          <div className="table-scroll">
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:c.paper, borderBottom:`1.5px solid ${c.ink}` }}>
                {['ID','NAME','CAT','LOC','LAST CAL','NEXT DUE','STATUS','ACTION'].map(h=>(
                  <th key={h} className="kicker" style={{ padding:'8px', textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(t=>(
                <tr key={t.id} style={{ borderBottom:`1px solid ${c.line}`, background: t.status==='overdue' ? '#fff5f0' : 'transparent' }}>
                  <td className="mono" style={{ padding:'8px', fontWeight:700 }}>{t.id}</td>
                  <td style={{ padding:'8px' }}>
                    <div style={{ fontWeight:600 }}>{t.name}</div>
                    <div className="thai" style={{ fontSize:10, color:c.steel }}>{t.th}</div>
                  </td>
                  <td className="mono" style={{ padding:'8px' }}>{t.cat}</td>
                  <td className="mono" style={{ padding:'8px' }}>{t.loc}</td>
                  <td className="mono" style={{ padding:'8px' }}>{t.lastCal}</td>
                  <td className="mono" style={{ padding:'8px', color: t.status==='overdue' ? c.ng : c.ink }}>
                    {t.daysLeft < 0 ? `${-t.daysLeft}D LATE` : `${t.daysLeft}D`}
                  </td>
                  <td style={{ padding:'8px' }}>
                    <span className="pill-v2" style={{
                      color: t.status==='overdue' ? '#fff' : t.status==='due' ? '#8a4500' : c.ok,
                      background: t.status==='overdue' ? c.ng : t.status==='due' ? '#fff2d8' : '#e7f3e8',
                      borderColor: t.status==='overdue' ? c.ng : t.status==='due' ? '#c47a00' : c.ok,
                    }}>{t.status}</span>
                  </td>
                  <td style={{ padding:'8px' }}>
                    {canEdit && (
                      <button onClick={()=>recordCal(t.id)} style={{
                        padding:'4px 10px', background:c.hi, border:'none',
                        fontFamily:'JetBrains Mono', fontSize:10, fontWeight:700, cursor:'pointer',
                      }}>+ RECORD CAL</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const KPI = ({label, sub, value, accent}) => (
  <div style={{ background:'#fff', border:`1px solid ${c.line}`, borderLeft:`3px solid ${accent}`, padding:'14px 16px' }}>
    <div className="kicker">{label}</div>
    <div className="mono" style={{ fontSize:30, fontWeight:700, lineHeight:1, marginTop:4 }}>{value}</div>
    <div className="thai" style={{ fontSize:11, color:c.steel, marginTop:4 }}>{sub}</div>
  </div>
);
