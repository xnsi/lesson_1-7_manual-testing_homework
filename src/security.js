import { PREFIX } from './api.js';

export const CANARY_KEY = `${PREFIX}canary`;
const INCIDENTS_KEY = `${PREFIX}incidents`;
let incidents = [];

function renderIncidents() {
  const list = document.querySelector('#incident-list');
  list.replaceChildren();
  for (const incident of [...incidents].reverse()) {
    const item = document.createElement('li');
    item.textContent = `${new Date(incident.time).toLocaleString('ru-RU')} - ${incident.type}: ${incident.reason}`;
    list.append(item);
  }
  document.querySelector('#incidents-empty').hidden = incidents.length > 0;
  document.querySelector('#incident-count').textContent = String(incidents.length);
}

export function reportIncident(type, reason) {
  incidents = [...incidents, { time: Date.now(), type, reason }].slice(-30);
  try {
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
  } catch {}
  renderIncidents();
}

// События: startup, refresh, submit, decoy. Условия ловушек добавьте здесь.
export function checkActivity(action, details = {}) {
  if (action === 'decoy') reportIncident('T3', 'Вызвана скрытая кнопка staff-export.');
  if (action === 'submit' && details.supportCode) reportIncident('T2', 'Заполнено скрытое поле supportCode.');
  if (action === 'submit' && details.topic && !['html', 'javascript', 'api'].includes(details.topic)) {
    reportIncident('T4', 'Получено направление вне списка.');
  }
  if (action === 'startup') {
    const url = new URL(location.href);
    if (url.searchParams.getAll('staff').includes('1')) {
      url.searchParams.delete('staff', '1');
      history.replaceState(history.state, '', url);
      reportIncident('T6', 'Обнаружен параметр staff=1.');
    }
  }
}

// Приложение вызывает эту функцию перед отправкой и обновлением списка.
export function isRestricted() {
  return false;
}

export function initializeSecurity() {
  try {
    const saved = JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]');
    incidents = Array.isArray(saved) ? saved.filter(item => item &&
      Number.isFinite(item.time) && Number.isFinite(new Date(item.time).getTime()) &&
      typeof item.type === 'string' && typeof item.reason === 'string')
      .slice(-30).map(({ time, type, reason }) => ({ time, type, reason })) : [];
  } catch { incidents = []; }
  renderIncidents();
  try {
    if (localStorage.getItem(CANARY_KEY) === null) {
      localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
    }
  } catch { /* Бонус должен учитывать недоступное хранилище. */ }
  checkActivity('startup');
}

export function resetSecurity() {
  incidents = [];
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX) && key !== `${PREFIX}applications`) localStorage.removeItem(key);
    }
    localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
  } catch { /* Учебный сброс остаётся доступным без storage. */ }
  renderIncidents();
  document.querySelector('#security-status').textContent = 'Ограничений нет';
  document.querySelector('#restriction-detail').hidden = true;
}
