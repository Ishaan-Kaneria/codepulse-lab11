// public/js/core.js - small helpers shared by every screen.
// The browser never talks to PostgreSQL. It only calls our Express API with fetch().

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- API ------------------------------------------------------------------
export async function api(path, options = {}) {
  const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new Error('Could not reach the API. Is the server running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status; err.hint = data.hint; err.data = data;
    throw err;
  }
  return data;
}
export const q = (key, params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));
  return api(`/api/q/${key}${qs.toString() ? `?${qs}` : ''}`);
};

// ---------- formatting -------------------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(v, withTime = false) {
  if (!v) return '—';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return esc(v);
  const d = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  return withTime && m[4] ? `${d}, ${m[4]}:${m[5]}` : d;
}
export const fmtNum = (v, digits) => (v === null || v === undefined || v === '' ? '—'
  : Number(v).toLocaleString('en-IN', digits !== undefined ? { minimumFractionDigits: digits, maximumFractionDigits: digits } : undefined));
export const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`);
export const diff = (d) => (d ? `<span class="tag d-${esc(d)}">${esc(d)}</span>` : '—');
export const verdict = (v) => (v ? `<span class="v v-${esc(v)}">${esc(v)}</span>` : '—');
export const level = (l) => (l ? `<span class="tag lvl-${esc(l)}">${esc(l.replace('_', ' '))}</span>` : '<span class="muted">—</span>');
export const status = (s) => {
  if (!s) return '—';
  const good = ['Active', 'Renewed', 'Success', 'Published', 'Approved', 'Completed'];
  const warn = ['Pending', 'Under_Review', 'Flagged', 'Draft', 'Locked', 'Hidden'];
  const bad = ['Expired', 'Cancelled', 'Failed', 'Removed', 'Abandoned', 'Retired'];
  const c = good.includes(s) ? 'st-good' : warn.includes(s) ? 'st-warn' : bad.includes(s) ? 'st-bad' : '';
  return `<span class="st ${c}">${esc(s.replace('_', ' '))}</span>`;
};
export const initials = (name) => esc((name || '?').split(/[_\s]/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join(''));

export const VERDICT_COLORS = { AC: '#2a9d8f', WA: '#c0473a', TLE: '#e09f3e', MLE: '#7b4fb3', RE: '#a3364f', CE: '#8a8f98' };
export const VERDICT_NAMES = { AC: 'Accepted', WA: 'Wrong Answer', TLE: 'Time Limit Exceeded', MLE: 'Memory Limit Exceeded', RE: 'Runtime Error', CE: 'Compile Error' };

// ---------- tables -----------------------------------------------------------------
// cols: [{ key, label, num, render(row), wrap }]
export function table(rows, cols, { onRow, empty = 'No rows found.', scroll = false } = {}) {
  if (!rows || !rows.length) return `<div class="empty">${esc(empty)}</div>`;
  const head = cols.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('');
  const body = rows.map((r, i) => `<tr ${onRow ? `class="click" data-i="${i}"` : ''}>${cols.map((c) => {
    const val = c.render ? c.render(r) : esc(r[c.key] ?? '—');
    return `<td class="${c.num ? 'num' : ''} ${c.wrap ? 'wrap' : ''}">${val}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="table-wrap ${scroll ? 't-scroll' : ''}"><table class="t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
export function bindRows(root, rows, onRow) {
  $$('tbody tr.click', root).forEach((tr) => tr.addEventListener('click', () => onRow(rows[Number(tr.dataset.i)])));
}
// Auto columns for any result set (Query Lab)
export function autoTable(rows, fields) {
  const cols = fields.map((f) => ({
    key: f, label: f,
    num: rows.some((r) => typeof r[f] === 'number'),
    render: (r) => {
      const v = r[f];
      if (v === null || v === undefined) return '<span class="muted">null</span>';
      if (f === 'verdict') return verdict(v);
      if (/difficulty/.test(f)) return diff(v);
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'number') return fmtNum(v);
      const s = String(v);
      return esc(s.length > 90 ? `${s.slice(0, 90)}…` : s);
    }
  }));
  return table(rows, cols);
}

// ---------- charts --------------------------------------------------------------------
export function bars(items, { color = 'var(--saffron)', max, fmt = (v) => fmtNum(v), labelW } = {}) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return `<div class="bars">${items.map((it, k) => `
    <div class="bar-row" ${labelW ? `style="grid-template-columns:${labelW}px 1fr 64px"` : ''}>
      <span class="lbl" title="${esc(it.label)}">${esc(it.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(100 * it.value) / top}%;background:${it.color || color};animation-delay:${k * 40}ms"></div></div>
      <span class="val">${fmt(it.value)}</span>
    </div>`).join('')}</div>`;
}
export function donut(items, centerValue, centerLabel) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let acc = 0;
  const stops = items.map((i) => { const a = (acc / total) * 360; acc += i.value; return `${i.color} ${a}deg ${(acc / total) * 360}deg`; }).join(', ');
  return `<div class="donut-wrap">
    <div class="donut" style="background:conic-gradient(${stops})"><div class="center"><div><b>${esc(centerValue)}</b><span>${esc(centerLabel)}</span></div></div></div>
    <div class="legend">${items.map((i) => `<div><i style="background:${i.color}"></i>${esc(i.label)}<b>${fmtNum(i.value)}</b> <span class="muted small">${((100 * i.value) / total).toFixed(1)}%</span></div>`).join('')}</div>
  </div>`;
}
export function columns(items, { alt = false } = {}) {
  const top = Math.max(...items.map((i) => i.value), 1);
  return `<div class="cols">${items.map((i, k) => `
    <div class="col" title="${esc(i.label)}: ${fmtNum(i.value)}"><b>${esc(i.show ?? fmtNum(i.value))}</b>
      <div class="stick ${alt ? 'alt' : ''}" style="height:${Math.max(3, (100 * i.value) / top) * 0.78}%;animation-delay:${k * 50}ms"></div>
      <small>${esc(i.label)}</small></div>`).join('')}</div>`;
}
export function lineChart(points, { height = 190 } = {}) {
  if (!points.length) return '<div class="empty">No data.</div>';
  const W = 640, H = height, P = { l: 44, r: 16, t: 14, b: 26 };
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 10; hi += 10; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = (i) => P.l + (points.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (points.length - 1));
  const y = (v) => P.t + ((hi - v) * (H - P.t - P.b)) / (hi - lo);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`;
  const ticks = [0, 0.5, 1].map((t) => lo + t * (hi - lo));
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e09f3e" stop-opacity=".35"/><stop offset="1" stop-color="#e09f3e" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((t) => `<line class="grid-l" x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${P.l - 8}" y="${y(t) + 4}" text-anchor="end">${Math.round(t)}</text>`).join('')}
    <path class="area" d="${area}"/><path class="line" d="${line}"/>
    ${points.map((p, i) => `<circle class="pt" cx="${x(i)}" cy="${y(p.y)}" r="4"><title>${esc(p.label)}: ${p.y}</title></circle>`).join('')}
    ${points.map((p, i) => (points.length <= 10 || i % Math.ceil(points.length / 8) === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(p.short || '')}</text>` : '')).join('')}
  </svg>`;
}

// ---------- SQL highlighting --------------------------------------------------------------
const KW = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|AND|OR|NOT|IN|EXISTS|AS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|DESC|ASC|DISTINCT|CASE|WHEN|THEN|ELSE|END|WITH|RECURSIVE|UNION|ALL|OVER|PARTITION|FILTER|BETWEEN|LIKE|ILIKE|IS|NULL|NULLS|LAST|TRUE|FALSE|CREATE|REPLACE|FUNCTION|RETURNS|LANGUAGE|STABLE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|RETURNING|CROSS|LATERAL|COUNT|SUM|AVG|MIN|MAX|ROUND|RANK|LAG|ROW_NUMBER|PERCENT_RANK|COALESCE|STRING_AGG|ARRAY_REMOVE|ARRAY|UNNEST|EXTRACT|NULLIF|DATE|TIME)\b/g;
export function highlightSQL(sql) {
  return esc(sql)
    .replace(/(--[^\n]*)/g, '\u0001$1\u0002')
    .replace(/(&#39;[^]*?&#39;)/g, '\u0003$1\u0004')
    .replace(KW, '<span class="kw">$1</span>')
    .replace(/(\$\d+)/g, '<span class="num">$1</span>')
    .replace(/\u0001([^\u0002]*)\u0002/g, (m, c) => `<span class="cm">${c.replace(/<[^>]+>/g, '')}</span>`)
    .replace(/\u0003([^\u0004]*)\u0004/g, (m, s) => `<span class="str">${s.replace(/<[^>]+>/g, '')}</span>`);
}

// ---------- drawer / modal / toast ------------------------------------------------------------
const scrim = () => $('#scrim');
export function openDrawer(title, html) {
  $('#drawer-title').innerHTML = title;
  $('#drawer-body').innerHTML = html;
  $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false');
  scrim().classList.add('on');
  $('#drawer-body').scrollTop = 0;
  return $('#drawer-body');
}
export function closeDrawer() {
  $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true');
  if (!$('#sidebar').classList.contains('on')) scrim().classList.remove('on');
}
export function openModal(title, html) {
  $('#modal-title').innerHTML = title;
  $('#modal-body').innerHTML = html;
  $('#modal').classList.add('on'); $('#modal').setAttribute('aria-hidden', 'false');
  return $('#modal-body');
}
export function closeModal() { $('#modal').classList.remove('on'); $('#modal').setAttribute('aria-hidden', 'true'); }
export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 4200);
}
export function errorBox(err) {
  return `<div class="note-box warn"><b>Could not load this data.</b> ${esc(err.message)}${err.hint ? `<br><span class="small">${esc(err.hint)}</span>` : ''}</div>`;
}

// Show the SQL behind one or more screen widgets
export async function showSQL(keys, title = 'SQL behind this screen') {
  const list = Array.isArray(keys) ? keys : [keys];
  const body = openDrawer(esc(title), '<div class="skeleton"></div><div class="skeleton"></div>');
  try {
    const items = await Promise.all(list.map((k) => api(`/api/sql/${k}`)));
    body.innerHTML = `<div class="note-box">These statements live on the server. The browser only sends the query name and values,
      which reach PostgreSQL as <code>$1, $2 …</code> placeholders, so user input can never change the SQL.</div>` +
      items.map((it) => `<div><h4>${esc(it.key)} · ${esc(it.srs)}${it.params.length ? ` · params: ${it.params.map(esc).join(', ')}` : ''}</h4>
        <div class="code">${highlightSQL(it.sql.trim())}</div></div>`).join('');
  } catch (e) { body.innerHTML = errorBox(e); }
}

export const icon = {
  sql: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>'
};
