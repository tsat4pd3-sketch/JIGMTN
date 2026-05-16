import { useState, useEffect } from 'react';
import { JIG_LIST } from './App.jsx';
import LoginScreen from './LoginScreen.jsx';
import DashboardScreen from './DashboardScreen.jsx';
import CalibrationScreen from './CalibrationScreen.jsx';
import AdminScreen from './AdminScreen.jsx';
import JigSetupScreen from './JigSetupScreen.jsx';
import OfflineIndicator from './OfflineIndicator.jsx';
import MobileHome from './MobileHome.jsx';
import MobileForm from './MobileForm.jsx';
import HistoryView from './HistoryView.jsx';
import { getSession, logout, can } from './auth.js';
import { loadRecords, createRecord, checkAuth } from './db.js';
import JIG_DIAGRAMS from './diagrams.js';
import './theme.css';

export default function Root() {
  const [session, setSession] = useState(getSession());
  const [route, setRoute] = useState('home'); // home | form | history | dashboard | calibration | admin | jigsetup
  const [activeJig, setActiveJig] = useState(null);
  const [records, setRecords] = useState([]);
  const [hasToken, setHasToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => { setHasToken(checkAuth()); }, []);
  useEffect(() => {
    if (!session) return;
    loadRecords().then(setRecords).catch(()=>setRecords([]));
  }, [session, route]);

  if (!session) {
    return <LoginScreen onLogin={(s)=>{ setSession(s); setRoute('home'); }} />;
  }

  const doLogout = () => {
    if (!confirm('ออกจากระบบ?')) return;
    logout(); setSession(null); setRoute('home');
  };

  const pickJig = (jig) => {
    if (!jig) {
      // open jig picker — for now, use the first overdue/ng or first jig
      const first = JIG_LIST[0];
      setActiveJig(first); setRoute('form');
      return;
    }
    setActiveJig(jig); setRoute('form');
  };

  const submitRecord = async (record) => {
    setSaveStatus('saving');
    try {
      const created = await createRecord(record);
      setRecords(prev => [created, ...prev]);
      setSaveStatus('saved');
      setTimeout(()=>setSaveStatus(null), 2000);
      setRoute('home');
    } catch (e) {
      setSaveStatus('error');
      // still cache locally — load v1 cache key if needed
      setRoute('home');
    }
  };

  return (
    <>
      <OfflineIndicator />
      {route === 'dashboard' && can(session,'dashboard.view') && (
        <DashboardScreen records={records} jigList={JIG_LIST} session={session}
          onBack={()=>setRoute('home')} onOpenJig={()=>setRoute('home')} />
      )}
      {route === 'calibration' && (
        <CalibrationScreen canEdit={can(session,'cal.edit')} onBack={()=>setRoute('home')} />
      )}
      {route === 'admin' && can(session,'admin.view') && (
        <AdminScreen onBack={()=>setRoute('home')} />
      )}
      {route === 'jigsetup' && can(session,'jig.setup') && (
        <JigSetupScreen jigList={JIG_LIST} onBack={()=>setRoute('home')} />
      )}
      {route === 'history' && (
        <HistoryView records={records} jigList={JIG_LIST} onBack={()=>setRoute('home')} />
      )}
      {route === 'form' && activeJig && (
        <MobileForm jig={activeJig} session={session}
          diagramSrc={(JIG_DIAGRAMS[activeJig.id]||[])[0]}
          onSubmit={submitRecord} onCancel={()=>setRoute('home')} />
      )}
      {route === 'home' && (
        <MobileHome
          session={session}
          jigList={JIG_LIST}
          records={records}
          hasToken={hasToken}
          saveStatus={saveStatus}
          onLogout={doLogout}
          onNavigate={setRoute}
          onPickJig={pickJig}
          onHistory={()=>setRoute('history')}
        />
      )}
    </>
  );
}
