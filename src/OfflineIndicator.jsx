import { useEffect, useState } from 'react';
import { subscribe, drainQueue } from './offline.js';

const c = { ink:'#0d0d0d', hi:'#ff6a00', ng:'#c8201d', ok:'#2f7d32' };

export default function OfflineIndicator() {
  const [s, setS] = useState({ online: true, queued: 0 });
  useEffect(() => subscribe(setS), []);
  if (s.online && s.queued === 0) return null;
  return (
    <div style={{
      position:'fixed', top:8, right:8, zIndex:9999,
      padding:'6px 10px',
      background: s.online ? c.hi : c.ng, color: s.online ? c.ink : '#fff',
      border: `1.5px solid ${c.ink}`,
      fontFamily:'JetBrains Mono, monospace', fontSize:10, fontWeight:700,
      letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:8,
    }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background: s.online ? c.ok : '#fff', boxShadow: s.online ? '0 0 4px #2f7d32' : 'none' }} />
      {s.online ? `ONLINE · ${s.queued} QUEUED` : `OFFLINE · ${s.queued} PENDING`}
      {s.online && s.queued > 0 && (
        <button onClick={drainQueue} style={{ marginLeft:4, padding:'2px 6px', background:c.ink, color:c.hi, border:'none', fontSize:9, fontWeight:700, cursor:'pointer' }}>SYNC NOW</button>
      )}
    </div>
  );
}
