/**
 * offline.js — Offline-first queue for PM records
 *
 * Strategy:
 *   - All writes go through queueWrite() — saved to localStorage immediately
 *   - When online, drainQueue() flushes pending writes to GitHub
 *   - Reads merge: cached records + queued (unflushed) records
 *
 * For real production: use IndexedDB (larger quota, async) and a service worker.
 */

import { createRecord, updateRecord, deleteRecord } from './db.js';

const QUEUE_KEY = 'pm_jig_queue_v2';
const CACHE_KEY = 'pm_jig_cache_v2';

let isOnline = navigator.onLine;
const listeners = new Set();

window.addEventListener('online', () => {
  isOnline = true;
  notify();
  drainQueue();
});
window.addEventListener('offline', () => {
  isOnline = false;
  notify();
});

function notify() { listeners.forEach(fn => fn(getStatus())); }

export function subscribe(fn) {
  listeners.add(fn);
  fn(getStatus());
  return () => listeners.delete(fn);
}

export function getStatus() {
  return { online: isOnline, queued: getQueue().length };
}

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (_) { return []; }
}
function setQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); notify(); }

export function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch (_) { return []; }
}
export function setCache(records) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(records));
}

export function queueWrite(op) {
  // op: { type: 'create'|'update'|'delete', record?, issueNumber?, queuedAt }
  const q = getQueue();
  q.push({ ...op, queuedAt: Date.now(), id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) });
  setQueue(q);
  if (isOnline) drainQueue();
}

let draining = false;
export async function drainQueue() {
  if (draining || !isOnline) return;
  draining = true;
  try {
    let q = getQueue();
    while (q.length > 0) {
      const op = q[0];
      try {
        if (op.type === 'create') await createRecord(op.record);
        else if (op.type === 'update') await updateRecord(op.record);
        else if (op.type === 'delete') await deleteRecord(op.issueNumber);
        q = q.slice(1);
        setQueue(q);
      } catch (e) {
        // network error — stop and retry later
        if (e.message && e.message.includes('Failed to fetch')) {
          isOnline = false;
          notify();
          break;
        }
        // permanent error — drop the op so we don't loop forever
        console.error('Drop failed op:', op, e);
        q = q.slice(1);
        setQueue(q);
      }
    }
  } finally {
    draining = false;
  }
}
