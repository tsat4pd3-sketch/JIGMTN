import { useState, useEffect } from 'react';
import { JIG_LIST } from './App.jsx';
import LoginScreen from './LoginScreen.jsx';
import DashboardScreen from './DashboardScreen.jsx';
import CalibrationScreen from './CalibrationScreen.jsx';
import AdminScreen from './AdminScreen.jsx';
import PMPlanningScreen from './PMPlanningScreen.jsx';
import OfflineIndicator from './OfflineIndicator.jsx';
import MobileHome from './MobileHome.jsx';
import MobileForm from './MobileForm.jsx';
import HistoryView from './HistoryView.jsx';
import { getSession, logout, can } from './auth.js';
import { loadRecords, createRecord, checkAuth, loadPlans, createPlan, updatePlan, completePlan } from './db.js';
import JIG_DIAGRAMS from './diagrams.js';
import { createNextPlanFromCompletion } from './pmPlan.js';
import './theme.css';

export default function Root() {
  const [session, setSession] = useState(getSession());
  const [route, setRoute] = useState('home'); // home | form | history | dashboard | calibration | planning | admin
  const [activeJig, setActiveJig] = useState(null);
  const [records, setRecords] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => { checkAuth().then(setHasToken).catch(()=>setHasToken({ ok:false })); }, []);
  useEffect(() => {
    if (!session) return;
    loadRecords().then(setRecords).catch(()=>setRecords([]));
    loadPlans().then(setPlans).catch(()=>setPlans([]));
  }, [session, route]);

  if (!session) {
    return <LoginScreen onLogin={(s)=>{ setSession(s); setRoute('home'); }} />;
  }

  const doLogout = () => {
    if (!confirm('ออกจากระบบ?')) return;
    logout(); setSession(null); setRoute('home');
  };

  const pickJig = (jig, plan = null) => {
    if (!jig) {
      // open jig picker — for now, use the first overdue/ng or first jig
      const first = JIG_LIST[0];
      setActivePlan(null); setActiveJig(first); setRoute('form');
      return;
    }
    setActivePlan(plan); setActiveJig(jig); setRoute('form');
  };

  const submitRecord = async (record) => {
    setSaveStatus('saving');
    try {
      const recordWithPlan = activePlan ? { ...record, planId: activePlan.id, engineerNote: activePlan.engineerNote } : record;
      const created = await createRecord(recordWithPlan);
      if (activePlan) {
        const nextPlan = createNextPlanFromCompletion(activePlan, created);
        await completePlan(activePlan.id, created, nextPlan);
        setPlans(prev => [nextPlan, ...prev.map(p => p.id === activePlan.id ? { ...p, status:'completed', completedAt:Date.now(), completedRecordId:created.id, updatedAt:Date.now() } : p)]);
      }
      setRecords(prev => [created, ...prev]);
      setActivePlan(null);
      setSaveStatus('saved');
      setTimeout(()=>setSaveStatus(null), 2000);
      setRoute('home');
    } catch (e) {
      setSaveStatus('error');
      setActivePlan(null);
      setRoute('home');
    }
  };


  const savePlan = async (plan) => {
    const saved = plans.some(p => p.id === plan.id) ? await updatePlan(plan) : await createPlan(plan);
    setPlans(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
  };

  const startPlan = async (plan) => {
    const jig = JIG_LIST.find(j => j.id === plan.jigId);
    if (!jig) return alert('ไม่พบ JIG ตามแผนนี้');
    const next = { ...plan, status: 'in_progress', updatedAt: Date.now() };
    await updatePlan(next);
    setPlans(prev => prev.map(p => p.id === plan.id ? next : p));
    pickJig(jig, next);
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
      {route === 'planning' && can(session,'planning.view') && (
        <PMPlanningScreen plans={plans} jigList={JIG_LIST} session={session}
          onBack={()=>setRoute('home')} onSavePlan={savePlan} onStartPlan={startPlan} />
      )}
      {route === 'history' && (
        <HistoryView records={records} jigList={JIG_LIST} onBack={()=>setRoute('home')} />
      )}
      {route === 'form' && activeJig && (
        <MobileForm jig={activeJig} session={session} plan={activePlan}
          diagramSrc={(JIG_DIAGRAMS[activeJig.id]||[])[0]}
          onSubmit={submitRecord} onCancel={()=>setRoute('home')} />
      )}
      {route === 'home' && (
        <MobileHome
          session={session}
          jigList={JIG_LIST}
          records={records}
          plans={plans}
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
