const MS_PER_DAY = 86400000;

export const PLAN_STATUSES = ['planned', 'in_progress', 'completed', 'overdue'];
export const PLAN_PRIORITIES = ['normal', 'high', 'urgent'];
export const PLAN_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly'];

export function makePlanId() {
  return `PM-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(dateISO, days) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function frequencyToDays(freq) {
  return ({ weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 }[freq] || 30);
}

export function derivePlanStatus(plan, now = new Date()) {
  if (!plan) return 'planned';
  if (plan.status === 'completed') return 'completed';
  const due = new Date(`${plan.dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return plan.status || 'planned';
  return due.getTime() < now.getTime() ? 'overdue' : (plan.status || 'planned');
}

export function daysUntilDue(plan, now = new Date()) {
  if (!plan?.dueDate) return null;
  const due = new Date(`${plan.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const base = new Date(now.toISOString().slice(0, 10) + 'T00:00:00');
  return Math.ceil((due.getTime() - base.getTime()) / MS_PER_DAY);
}

export function createNextPlanFromCompletion(plan, completedRecord) {
  const nextDue = addDaysISO(completedRecord?.pmDate || todayISO(), frequencyToDays(plan.frequency));
  return {
    ...plan,
    id: makePlanId(),
    dueDate: nextDue,
    status: 'planned',
    completedAt: null,
    completedRecordId: null,
    parentPlanId: plan.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function summarizePlans(plans = []) {
  return plans.reduce((acc, p) => {
    const status = derivePlanStatus(p);
    acc.total += 1;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { total: 0, planned: 0, in_progress: 0, completed: 0, overdue: 0 });
}
