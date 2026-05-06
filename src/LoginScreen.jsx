import { useState } from 'react';
import { login, getRoster } from './auth.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', paper:'#f4f1ea', line:'#d8d4cc', ng:'#c8201d', steel:'#6b6b6b' };

export default function LoginScreen({ onLogin }) {
  const [emp, setEmp] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    const result = login(emp, pin);
    if (!result.ok) { setErr('รหัสพนักงาน หรือ PIN ไม่ถูกต้อง'); setPin(''); return; }
    onLogin(result.session);
  };

  const padKey = (k) => {
    if (k === '⌫') setPin(p => p.slice(0, -1));
    else if (pin.length < 4) setPin(p => p + k);
  };

  const roster = getRoster();

  return (
    <div style={{ minHeight:'100vh', background:c.paper, display:'flex', flexDirection:'column' }}>
      <div className="hazard" style={{ height:8 }} />
      <div style={{ background:c.ink, color:'#fff', padding:'14px 20px' }}>
        <div className="kicker" style={{ color:c.hi }}>PM JIG · LINE 061 · BRANCH 01</div>
        <div style={{ fontSize:18, fontWeight:700 }}>Sign In · เข้าสู่ระบบ</div>
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ width:'100%', maxWidth:380, background:'#fff', border:`2px solid ${c.ink}`, padding:20 }}>
          <div className="kicker" style={{ marginBottom:6 }}>EMPLOYEE ID · รหัสพนักงาน</div>
          <input
            value={emp}
            onChange={e=>{ setEmp(e.target.value.toUpperCase()); setErr(''); }}
            placeholder="EMP-XXXXX"
            style={{
              width:'100%', height:48, padding:'0 12px',
              border:`1.5px solid ${c.ink}`, fontFamily:'JetBrains Mono, monospace',
              fontSize:16, fontWeight:700, letterSpacing:'0.04em',
              background:c.paper, color:c.ink, marginBottom:14,
            }}
          />

          <div className="kicker" style={{ marginBottom:6 }}>PIN · 4 หลัก</div>
          <div style={{
            height:56, border:`1.5px solid ${c.ink}`, background:c.paper,
            display:'flex', alignItems:'center', justifyContent:'center', gap:14,
            marginBottom:14,
          }}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{
                width:18, height:18, borderRadius:'50%',
                background: i < pin.length ? c.ink : 'transparent',
                border:`2px solid ${c.ink}`,
              }} />
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k,i)=>(
              <button key={i} disabled={!k} onClick={()=>padKey(k)} style={{
                height:54,
                background: !k ? 'transparent' : k==='⌫' ? c.ink : '#fff',
                color: k==='⌫' ? c.hi : c.ink,
                border: !k ? 'none' : `1.5px solid ${c.ink}`,
                fontFamily:'JetBrains Mono, monospace', fontSize:18, fontWeight:700,
                cursor: k ? 'pointer' : 'default',
              }}>{k}</button>
            ))}
          </div>

          {err && <div style={{ marginTop:14, padding:'8px 12px', background:'#fbe7e6', border:`1.5px solid ${c.ng}`, color:c.ng, fontSize:12, fontWeight:600 }}>⚠ {err}</div>}

          <button onClick={submit} disabled={!emp || pin.length<4} style={{
            width:'100%', height:56, marginTop:14,
            background: (!emp || pin.length<4) ? c.line : c.hi,
            color: c.ink, border:'none', boxShadow: (!emp || pin.length<4) ? 'none' : '0 3px 0 #c44e00',
            fontSize:14, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
            cursor: (!emp || pin.length<4) ? 'not-allowed' : 'pointer',
          }}>Sign In · เข้าระบบ</button>

          <div style={{ marginTop:14, paddingTop:14, borderTop:`1px dashed ${c.line}` }}>
            <div className="kicker" style={{ marginBottom:6 }}>DEMO ACCOUNTS · ตัวอย่าง</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:c.steel, lineHeight:1.7 }}>
              {roster.slice(0,3).map(u => (
                <div key={u.emp} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>{u.emp} · {u.role}</span>
                  <button onClick={()=>{ setEmp(u.emp); setPin(u.pin); setErr(''); }}
                    style={{ background:'transparent', border:'none', color:c.hi, fontFamily:'inherit', fontSize:10, cursor:'pointer' }}>
                    USE · {u.pin}
                  </button>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span>SUP-001 · supervisor</span>
                <button onClick={()=>{ setEmp('SUP-001'); setPin('9999'); setErr(''); }}
                  style={{ background:'transparent', border:'none', color:c.hi, fontFamily:'inherit', fontSize:10, cursor:'pointer' }}>USE · 9999</button>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span>ADM-001 · admin</span>
                <button onClick={()=>{ setEmp('ADM-001'); setPin('0000'); setErr(''); }}
                  style={{ background:'transparent', border:'none', color:c.hi, fontFamily:'inherit', fontSize:10, cursor:'pointer' }}>USE · 0000</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
