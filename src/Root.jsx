import { useState, useEffect } from 'react';
import { JIG_LIST } from './App.jsx';
import LoginScreen from './LoginScreen.jsx';
import DashboardScreen from './DashboardScreen.jsx';
import CalibrationScreen from './CalibrationScreen.jsx';
import AdminScreen from './AdminScreen.jsx';
import JigSetupScreen from './JigSetupScreen.jsx';
import PMPlanningScreen from './PMPlanningScreen.jsx';
import AnalyticsScreen from './AnalyticsScreen.jsx';
import OfflineIndicator from './OfflineIndicator.jsx';
import MobileHome from './MobileHome.jsx';
import MobileForm from './MobileForm.jsx';
import HistoryView from './HistoryView.jsx';
import { getSession, logout, can } from './auth.js';
import { loadRecords, createRecord, checkAuth, loadPlans, createPlan, completePlan } from './db.js';
import JIG_DIAGRAMS from './diagrams.js';
import './theme.css';

export default function Root() {
  const [session,    setSession]    = useState(getSession());
  const [route,      setRoute]      = useState('home');
  const [activeJig,  setActiveJig]  = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [records,    setRecords]    = useState([]);
  const [plans,      setPlans]      = useState([]);
  const [hasToken,   setHasToken]   = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => { checkAuth().then(r => setHasToken(r.ok)); }, []);

  useEffect(() => {
    if (!session) return;
    loadRecords().then(setRecords).catch(() => setRecords([]));
    loadPlans().then(setPlans).catch(() => setPlans([]));
  }, [session, route]);

  if (!session) {
    return <LoginScreen onLogin={(s) => { setSession(s); setRoute('home'); }} />;
  }

  const doLogout = () => {
    if (!confirm('ออกจากระบบ?')) return;
    logout(); setSession(null); setRoute('home');
  };

  const pickJig = (jig, plan = null) => {
    if (!jig) {
      setActiveJig(JIG_LIST[0]); setActivePlan(null); setRoute('form');
      return;
    }
    setActiveJig(jig); setActivePlan(plan || null); setRoute('form');
  };

  const submitRecord = async (record) => {
    setSaveStatus('saving');
    try {
      const created = await createRecord(record);
      setRecords(prev => [created, ...prev]);
      if (activePlan?.id) {
        try { await completePlan(activePlan.id, created); } catch (_) {}
        setPlans(prev => prev.map(p => p.id === activePlan.id ? { ...p, status: 'completed' } : p));
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
      setActivePlan(null); setRoute('home');
    } catch (_) {
      setSaveStatus('error');
      setRecords(prev => [record, ...prev.filter(r => r.createdAt !== record.createdAt)]);
      setTimeout(() => setSaveStatus(null), 4000);
      setActivePlan(null); setRoute('home');
    }
  };

  const savePlan = async (plan) => {
    try {
      const created = await createPlan(plan);
      setPlans(prev => [created, ...prev.filter(p => p.id !== created.id)]);
    } catch (_) {
      setPlans(prev => [plan, ...prev.filter(p => p.id !== plan.id)]);
    }
  };

  const startPlan = (plan) => {
    const jig = JIG_LIST.find(j => j.id === plan.jigId);
    if (jig) pickJig(jig, plan);
  };

  return (
    <>
      <OfflineIndicator />
      {route === 'analytics' && (
        <AnalyticsScreen records={records} jigList={JIG_LIST} session={session}
          onBack={() => setRoute('home')} />
      )}
      {route === 'dashboard' && can(session, 'dashboard.view') && (
        <DashboardScreen records={records} jigList={JIG_LIST} session={session}
          onBack={() => setRoute('home')} onOpenJig={() => setRoute('home')} />
      )}
      {route === 'calibration' && (
        <CalibrationScreen canEdit={can(session, 'cal.edit')} onBack={() => setRoute('home')} />
      )}
      {route === 'admin' && can(session, 'admin.view') && (
        <AdminScreen onBack={() => setRoute('home')} />
      )}
      {route === 'jigsetup' && can(session, 'jig.setup') && (
        <JigSetupScreen jigList={JIG_LIST} onBack={() => setRoute('home')} />
      )}
      {route === 'planning' && (
        <PMPlanningScreen
          plans={plans} jigList={JIG_LIST} session={session}
          onBack={() => setRoute('home')}
          onSavePlan={savePlan}
          onStartPlan={startPlan}
        />
      )}
      {route === 'history' && (
        <HistoryView records={records} jigList={JIG_LIST} onBack={() => setRoute('home')} />
      )}
      {route === 'form' && activeJig && (
        <MobileForm jig={activeJig} session={session} plan={activePlan}
          diagramSrc={(JIG_DIAGRAMS[activeJig.id] || [])[0]}
          onSubmit={submitRecord} onCancel={() => { setActivePlan(null); setRoute('home'); }} />
      )}
      {route === 'home' && (
        <MobileHome
          session={session} jigList={JIG_LIST} records={records} plans={plans}
          hasToken={hasToken} saveStatus={saveStatus}
          onLogout={doLogout} onNavigate={setRoute}
          onPickJig={pickJig} onHistory={() => setRoute('history')}
        />
      )}
    </>
  );
}
