// public/js/app.js - screens of the CodePulse GUI (hash routing, no framework).
import {
  $, $$, esc, api, q, fmtDate, fmtNum, pct, diff, verdict, level, status, initials, table, bindRows, autoTable,
  bars, donut, columns, lineChart, highlightSQL, openDrawer, closeDrawer, openModal, closeModal, toast, errorBox,
  showSQL, icon, VERDICT_COLORS, VERDICT_NAMES
} from './core.js';

// ---------------------------------------------------------------- navigation
const I = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
const NAV = [
  { group: 'Home' },
  { id: 'overview', label: 'Overview', icon: I('<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>') },
  { group: 'Practice' },
  { id: 'problems', label: 'Problem Library', srs: '1·2', icon: I('<path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6M9 18h3"/>') },
  { id: 'submissions', label: 'Submissions & Judge', srs: '3', icon: I('<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>') },
  { id: 'contests', label: 'Contests & Leaderboard', srs: '4', icon: I('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>') },
  { id: 'solvers', label: 'Solver Progress', srs: '5', icon: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>') },
  { group: 'Business' },
  { id: 'premium', label: 'Premium & Access', srs: '6', icon: I('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>') },
  { id: 'companies', label: 'Companies & Editorials', srs: '7', icon: I('<path d="M4 21V8l6-4v17M10 21h10V10l-6-2M7 10v.01M7 14v.01M7 18v.01M14 13h3M14 17h3"/>') },
  { group: 'Community' },
  { id: 'community', label: 'Discussions', srs: '8', icon: I('<path d="M4 5h16v11H9l-5 4z"/>') },
  { id: 'moderation', label: 'Moderation', srs: '9', icon: I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>') },
  { id: 'plans', label: 'Study Plans & Badges', srs: '10', icon: I('<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>') },
  { group: 'Trust' },
  { id: 'integrity', label: 'Code Integrity', srs: '11·12', icon: I('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>') },
  { group: 'Labs' },
  { id: 'querylab', label: 'Query Lab · 10A', icon: I('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7 15h10"/>') },
  { id: 'connection', label: 'Connection & Schema', icon: I('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>') }
];

const SRS = [
  { n: 1, t: 'Problem Library', d: 'Problems linked to many topic tags', page: 'problems' },
  { n: 2, t: 'Judging & Test Cases', d: 'Test files kept as URLs, numbered per problem', page: 'problems' },
  { n: 3, t: 'Execution Status Logging', d: 'ENUM verdicts and one failure log per failure', page: 'submissions' },
  { n: 4, t: 'Real-Time Leaderboard', d: 'Pre-calculated ranks in participations', page: 'contests' },
  { n: 5, t: 'Progress & Streaks', d: 'Streaks, solved counts, topic accuracy', page: 'solvers' },
  { n: 6, t: 'Subscription & Premium', d: 'Tiers, payments and feature gating rules', page: 'premium' },
  { n: 7, t: 'Editorials & Companies', d: 'Write-ups, snippets, dated frequency snapshots', page: 'companies' },
  { n: 8, t: 'Discussion & Reputation', d: 'Posts, comments, replies, reactions, follows', page: 'community' },
  { n: 9, t: 'Content Moderation', d: 'Reports and the full review history', page: 'moderation' },
  { n: 10, t: 'Study Plans & Badges', d: 'Ordered plan days, enrolments, awards', page: 'plans' },
  { n: 11, t: 'Code Deduplication', d: 'SHA-256 code blobs catch copied code', page: 'integrity' },
  { n: 12, t: 'Disjoint Failure Logging', d: 'Composite keys keep log types apart', page: 'integrity' }
];

function renderNav(active) {
  $('#nav').innerHTML = NAV.map((n) => n.group
    ? `<div class="group">${esc(n.group)}</div>`
    : `<a href="#/${n.id}" class="${n.id === active ? 'active' : ''}">${n.icon}<span>${esc(n.label)}</span>${n.srs ? `<span class="srs">SRS ${n.srs}</span>` : ''}</a>`).join('');
}

function head({ title, srs = [], desc = '', sql = [], actions = '' }) {
  return `<div class="page-head fade-in">
    <div>
      <div class="eyebrow">${srs.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
      <h1>${esc(title)}</h1>
      ${desc ? `<p>${desc}</p>` : ''}
    </div>
    <div class="head-actions">${actions}${sql.length ? `<button class="btn" data-sql='${esc(JSON.stringify(sql))}'>${icon.sql} View SQL</button>` : ''}</div>
  </div>`;
}
const card = (title, body, { sub = '', tools = '', flush = false, cls = '' } = {}) =>
  `<section class="card ${cls}"><div class="card-head"><h3>${title}</h3>${sub ? `<span class="sub">${sub}</span>` : ''}<div class="tools">${tools}</div></div>
   <div class="card-body ${flush ? 'flush' : ''}">${body}</div></section>`;
const kpi = (label, value, note = '', accent = 'var(--saffron-soft)') =>
  `<div class="card kpi" style="--accent-soft:${accent}"><span class="label">${esc(label)}</span><span class="value">${value}</span>${note ? `<span class="note">${note}</span>` : ''}</div>`;
const loading = '<div class="skeleton"></div><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:85%"></div>';

// fill an element with the result of an async renderer, showing errors in place
async function fill(el, fn) {
  if (typeof el === 'string') el = $(el);
  if (!el) return;
  el.innerHTML = loading;
  try { await fn(el); } catch (e) { el.innerHTML = errorBox(e); }
}

// ---------------------------------------------------------------- Overview
async function pageOverview(v) {
  v.innerHTML = `
    <section class="hero fade-in">
      <svg class="hero-wave" viewBox="0 0 340 120"><path d="M0 70h60l18-48 26 90 20-42h40l16-30 22 58 18-28h120"/></svg>
      <div class="kicker">Team 25 · MC212 Database Management Systems</div>
      <h1>LeetCode-style Practice Management System</h1>
      <p>A live window into our PostgreSQL database: 42 normalised tables (BCNF), served through Node.js, Express and node-postgres.
        Every number on this page is read from the database when the page opens.</p>
      <div class="hero-grid" id="hero-stats">${'<div class="hero-stat"><b>…</b><span>&nbsp;</span></div>'.repeat(6)}</div>
    </section>
    <div class="grid g3 mb">
      <div id="ov-verdicts"></div><div id="ov-diff"></div><div id="ov-lang"></div>
    </div>
    <div class="grid g-2-1 mb"><div id="ov-recent"></div><div id="ov-topics"></div></div>
    ${card('What the database delivers', `<div class="srs-grid">${SRS.map((s) => `<a class="srs-card" href="#/${s.page}"><span class="no">SRS ${s.n}</span><b>${esc(s.t)}</b><span>${esc(s.d)}</span></a>`).join('')}</div>`,
      { sub: 'The 12 product functions of SRS V6, each with its own screen' })}`;

  fill('#hero-stats', async (el) => {
    const s = (await q('overview.stats')).rows[0];
    el.innerHTML = [
      [fmtNum(s.users), 'registered users'], [fmtNum(s.problems), 'problems'], [fmtNum(s.submissions), 'submissions'],
      [pct(s.acceptance_pct), 'acceptance rate'], [fmtNum(s.contests), 'contests'], [fmtNum(s.active_premium), 'active Premium']
    ].map(([b, t]) => `<div class="hero-stat"><b>${b}</b><span>${t}</span></div>`).join('');
  });
  fill('#ov-verdicts', async (el) => {
    const rows = (await q('overview.verdicts')).rows;
    const total = rows.reduce((s, r) => s + r.total, 0);
    const ac = rows.find((r) => r.verdict === 'AC')?.total || 0;
    el.innerHTML = card('Verdicts', donut(rows.map((r) => ({ label: VERDICT_NAMES[r.verdict], value: r.total, color: VERDICT_COLORS[r.verdict] })), pct((100 * ac) / total), 'accepted'),
      { sub: 'SRS 3', tools: `<button class="btn sm" data-sql='["overview.verdicts"]'>${icon.sql}</button>` });
  });
  fill('#ov-diff', async (el) => {
    const rows = (await q('overview.difficulty')).rows;
    const color = { Easy: 'var(--easy)', Medium: 'var(--medium)', Hard: 'var(--hard)' };
    el.innerHTML = card('Problems by difficulty',
      `${bars(rows.map((r) => ({ label: r.difficulty, value: r.problems, color: color[r.difficulty] })), { labelW: 80 })}
       <div class="small muted" style="margin-top:14px">Average acceptance: ${rows.map((r) => `<b>${esc(r.difficulty)}</b> ${pct(r.avg_acceptance)}`).join(' · ')}</div>`,
      { sub: 'SRS 1', tools: `<button class="btn sm" data-sql='["overview.difficulty"]'>${icon.sql}</button>` });
  });
  fill('#ov-lang', async (el) => {
    const rows = (await q('overview.languages')).rows;
    el.innerHTML = card('Languages', `${columns(rows.map((r) => ({ label: r.language, value: r.submissions })))}
      <div class="small muted" style="margin-top:6px">${rows.map((r) => `<b>${esc(r.language)}</b> ${pct(r.ac_pct)} AC`).join(' · ')}</div>`,
      { sub: 'submissions per language', tools: `<button class="btn sm" data-sql='["overview.languages"]'>${icon.sql}</button>` });
  });
  fill('#ov-recent', async (el) => {
    const rows = (await q('overview.recent')).rows;
    el.innerHTML = card('Latest submissions', table(rows, [
      { label: 'User', render: (r) => `<span class="strong">${esc(r.username)}</span>` },
      { label: 'Problem', key: 'title' }, { label: 'Lang', key: 'language' },
      { label: 'Verdict', render: (r) => verdict(r.verdict) }, { label: 'Runtime', num: true, render: (r) => (r.runtime_ms === null ? '—' : `${fmtNum(r.runtime_ms)} ms`) },
      { label: 'When', render: (r) => fmtDate(r.submission_timestamp, true) }
    ], { onRow: true }), { flush: true, sub: 'click a row for the judge log', tools: `<a class="btn sm" href="#/submissions">All ${icon.arrow}</a>` });
    bindRows(el, rows, (r) => openSubmission(r.submission_id));
  });
  fill('#ov-topics', async (el) => {
    const rows = (await q('overview.topics')).rows;
    el.innerHTML = card('Most-tagged topics', bars(rows.map((r) => ({ label: r.topic_name, value: r.problems })), { color: 'var(--teal)', labelW: 170 }),
      { sub: 'problem_topics' });
  });
}

// ---------------------------------------------------------------- Problems (CRUD)
const pstate = { q: '', difficulty: '', topic_id: '', company_id: '', sort: 'id', page: 1, size: 15 };
let META = null;
async function getMeta() { if (!META) META = await api('/api/problems/meta'); return META; }

async function pageProblems(v) {
  v.innerHTML = head({
    title: 'Problem Library', srs: ['SRS 1', 'SRS 2', 'SRS 7', 'CRUD · problems'],
    desc: 'Our main table for Lab 11. Search, filter, open a problem, then <b>add</b>, <b>edit</b> or <b>delete</b> it. Every change is written straight to PostgreSQL.',
    actions: `<button class="btn accent" id="new-problem">${icon.plus} New problem</button>`
  }) + `<section class="card fade-in">
      <div class="filters">
        <div class="search">${icon.search}<input class="input" id="p-q" placeholder="Search title or id…" value="${esc(pstate.q)}"></div>
        <div class="seg" id="p-diff">${['', 'Easy', 'Medium', 'Hard'].map((d) => `<button data-v="${d}" class="${pstate.difficulty === d ? 'on' : ''}">${d || 'All'}</button>`).join('')}</div>
        <select class="input" id="p-topic"><option value="">All topics</option></select>
        <select class="input" id="p-company"><option value="">All companies</option></select>
        <select class="input" id="p-sort">
          ${[['id', 'Sort: ID'], ['newest', 'Newest first'], ['title', 'Title A–Z'], ['acceptance', 'Highest acceptance'], ['hardest', 'Lowest acceptance'], ['attempts', 'Most attempted']]
            .map(([k, l]) => `<option value="${k}" ${pstate.sort === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div id="p-table">${loading}</div>
      <div class="pager" id="p-pager"></div>
    </section>`;

  const meta = await getMeta().catch(() => null);
  if (meta) {
    $('#p-topic').innerHTML += meta.topics.map((t) => `<option value="${t.topic_id}" ${String(pstate.topic_id) === String(t.topic_id) ? 'selected' : ''}>${esc(t.topic_name)}</option>`).join('');
    $('#p-company').innerHTML += meta.companies.map((c) => `<option value="${c.company_id}" ${String(pstate.company_id) === String(c.company_id) ? 'selected' : ''}>${esc(c.company_name)}</option>`).join('');
  }
  let timer;
  $('#p-q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { pstate.q = e.target.value; pstate.page = 1; loadProblems(); }, 250); });
  $$('#p-diff button').forEach((b) => b.addEventListener('click', () => { pstate.difficulty = b.dataset.v; pstate.page = 1; $$('#p-diff button').forEach((x) => x.classList.toggle('on', x === b)); loadProblems(); }));
  $('#p-topic').addEventListener('change', (e) => { pstate.topic_id = e.target.value; pstate.page = 1; loadProblems(); });
  $('#p-company').addEventListener('change', (e) => { pstate.company_id = e.target.value; pstate.page = 1; loadProblems(); });
  $('#p-sort').addEventListener('change', (e) => { pstate.sort = e.target.value; loadProblems(); });
  $('#new-problem').addEventListener('click', () => problemForm());
  loadProblems();
}

async function loadProblems() {
  const el = $('#p-table'); if (!el) return;
  try {
    const qs = new URLSearchParams(Object.entries(pstate).filter(([, x]) => x !== ''));
    const data = await api(`/api/problems?${qs}`);
    el.innerHTML = table(data.rows, [
      { label: '#', num: true, render: (r) => `<span class="muted">${r.problem_id}</span>` },
      { label: 'Title', render: (r) => `<span class="strong">${esc(r.title)}</span>` },
      { label: 'Difficulty', render: (r) => diff(r.difficulty) },
      { label: 'Topics', wrap: true, render: (r) => `<span class="small muted">${esc(r.topics || '—')}</span>` },
      { label: 'Acceptance', num: true, render: (r) => pct(r.global_acceptance_rate) },
      { label: 'Attempts', num: true, render: (r) => fmtNum(r.total_attempts) },
      { label: 'Access', render: (r) => level(r.access) }
    ], { onRow: true, empty: 'No problems match these filters.' });
    bindRows(el, data.rows, (r) => openProblem(r.problem_id));
    const pages = Math.max(1, Math.ceil(data.total / data.size));
    $('#p-pager').innerHTML = `<span>${fmtNum(data.total)} problems · page ${data.page} of ${pages}</span>
      <span><button class="btn sm" id="pg-prev" ${data.page <= 1 ? 'disabled' : ''}>← Prev</button>
      <button class="btn sm" id="pg-next" ${data.page >= pages ? 'disabled' : ''}>Next →</button></span>`;
    $('#pg-prev').onclick = () => { pstate.page -= 1; loadProblems(); };
    $('#pg-next').onclick = () => { pstate.page += 1; loadProblems(); };
  } catch (e) { el.innerHTML = errorBox(e); }
}

async function openProblem(id) {
  const body = openDrawer(`Problem #${id}`, loading);
  try {
    const d = await api(`/api/problems/${id}`);
    const p = d.problem;
    const total = d.verdicts.reduce((s, r) => s + r.total, 0);
    $('#drawer-title').innerHTML = `${esc(p.title)} <span class="muted small">#${p.problem_id}</span>`;
    body.innerHTML = `
      <div class="pill-row">${diff(p.difficulty_level)} ${level(p.access)} <span class="chip ghost">setter: ${esc(p.setter)}</span>
        <span class="chip ghost">${fmtNum(p.time_limit_ms)} ms · ${fmtNum(p.memory_limit_mb)} MB</span></div>
      <div style="display:flex;gap:8px">
        <button class="btn primary" id="d-edit">${icon.edit} Edit</button>
        <button class="btn danger" id="d-del">${icon.trash} Delete</button>
      </div>
      <div><h4>Description</h4><p style="margin:0;white-space:pre-wrap">${esc(p.full_description)}</p></div>
      ${p.constraint_text ? `<div><h4>Constraints</h4><div class="code" style="white-space:pre-wrap">${esc(p.constraint_text)}</div></div>` : ''}
      ${p.sample_input || p.sample_output ? `<div class="grid g2"><div><h4>Sample input</h4><div class="code">${esc(p.sample_input || '')}</div></div><div><h4>Sample output</h4><div class="code">${esc(p.sample_output || '')}</div></div></div>` : ''}
      <div class="grid g2">
        <div><h4>Topics · SRS 1</h4><div class="pill-row">${d.topics.map((t) => `<span class="chip teal">${esc(t.topic_name)}</span>`).join('') || '<span class="muted">No topics yet</span>'}</div></div>
        <div><h4>Asked by · SRS 7</h4><div class="pill-row">${d.companies.map((c) => `<span class="chip">${esc(c.company_name)}</span>`).join('') || '<span class="muted">No companies yet</span>'}</div></div>
      </div>
      <div><h4>Judging · ${fmtNum(total)} submissions · SRS 3</h4>${total ? donut(d.verdicts.map((r) => ({ label: VERDICT_NAMES[r.verdict], value: r.total, color: VERDICT_COLORS[r.verdict] })), pct(p.global_acceptance_rate), 'acceptance') : '<span class="muted">No submissions yet.</span>'}</div>
      ${d.languages.length ? `<div><h4>By language</h4>${table(d.languages, [{ label: 'Language', key: 'language' }, { label: 'Submissions', num: true, key: 'submissions' }, { label: 'Best AC runtime', num: true, render: (r) => (r.best_runtime_ms === null ? '—' : `${r.best_runtime_ms} ms`) }])}</div>` : ''}
      <div><h4>Hidden test cases · SRS 2</h4>${table(d.tests, [
        { label: 'No.', num: true, key: 'test_case_no' }, { label: 'File URL', render: (r) => `<span class="mono small">${esc(r.file_url)}</span>` },
        { label: 'Sample', render: (r) => (r.sample_flag ? '<span class="chip teal">sample</span>' : '<span class="muted">hidden</span>') }, { label: 'Weight', num: true, key: 'weight' }
      ], { empty: 'No test cases stored for this problem.' })}</div>
      ${d.editorials.length ? `<div><h4>Editorial</h4>${table(d.editorials, [{ label: 'Time', key: 'time_complexity' }, { label: 'Space', key: 'space_complexity' }, { label: 'Status', render: (r) => status(r.status) }, { label: 'Views', num: true, render: (r) => fmtNum(r.view_count) }])}</div>` : ''}`;
    $('#d-edit').onclick = () => problemForm(d);
    $('#d-del').onclick = () => confirmDelete(p);
  } catch (e) { body.innerHTML = errorBox(e); }
}

async function problemForm(existing) {
  const meta = await getMeta();
  const p = existing?.problem || { difficulty_level: 'Easy', time_limit_ms: 1000, memory_limit_mb: 256 };
  const topicSet = new Set((existing?.topics || []).map((t) => t.topic_id));
  const compSet = new Set((existing?.companies || []).map((c) => c.company_id));
  const editing = Boolean(existing);
  const body = openModal(editing ? `Edit problem #${p.problem_id}` : 'Add a new problem', `
    <form class="form" id="pform" novalidate>
      <label class="full">Title<input class="input" name="title" maxlength="150" required value="${esc(p.title || '')}" placeholder="e.g. Longest Balanced Substring"></label>
      <label>Difficulty<select class="input" name="difficulty_level">${['Easy', 'Medium', 'Hard'].map((x) => `<option ${p.difficulty_level === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Problem setter<select class="input" name="setter_id">${meta.setters.map((s) => `<option value="${s.user_id}" ${p.setter_id === s.user_id ? 'selected' : ''}>${esc(s.username)} (#${s.user_id})</option>`).join('')}</select></label>
      <label>Time limit (ms) <span class="hint">100 to 10000</span><input class="input" type="number" name="time_limit_ms" min="100" max="10000" value="${esc(p.time_limit_ms)}"></label>
      <label>Memory limit (MB) <span class="hint">16 to 1024</span><input class="input" type="number" name="memory_limit_mb" min="16" max="1024" value="${esc(p.memory_limit_mb)}"></label>
      <label class="full">Access rule (feature_gating_rules)<select class="input" name="rule_id"><option value="">No rule (open to everyone)</option>${meta.rules.map((r) => `<option value="${r.rule_id}" ${p.rule_id === r.rule_id ? 'selected' : ''}>${esc(r.feature_name)} · ${esc(r.level)}</option>`).join('')}</select></label>
      <label class="full">Description<textarea class="input" name="full_description" required placeholder="Explain the task…">${esc(p.full_description || '')}</textarea></label>
      <label class="full">Constraints<textarea class="input" name="constraint_text" placeholder="1 <= n <= 10^5">${esc(p.constraint_text || '')}</textarea></label>
      <label>Sample input<textarea class="input mono" name="sample_input">${esc(p.sample_input || '')}</textarea></label>
      <label>Sample output<textarea class="input mono" name="sample_output">${esc(p.sample_output || '')}</textarea></label>
      <label class="full">Topic tags (problem_topics)<div class="picker">${meta.topics.map((t) => `<label><input type="checkbox" name="topic_ids" value="${t.topic_id}" ${topicSet.has(t.topic_id) ? 'checked' : ''}>${esc(t.topic_name)}</label>`).join('')}</div></label>
      <label class="full">Companies (problem_companies)<div class="picker">${meta.companies.map((c) => `<label><input type="checkbox" name="company_ids" value="${c.company_id}" ${compSet.has(c.company_id) ? 'checked' : ''}>${esc(c.company_name)}</label>`).join('')}</div></label>
      <div class="form-error" id="pform-err"></div>
    </form>
    <div class="form-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="psave">${icon.check} ${editing ? 'Save changes' : 'Create problem'}</button></div>`);

  $('#psave', body).onclick = async () => {
    const f = $('#pform', body);
    const fd = new FormData(f);
    const payload = Object.fromEntries([...fd.entries()].filter(([k]) => !['topic_ids', 'company_ids'].includes(k)));
    payload.topic_ids = fd.getAll('topic_ids'); payload.company_ids = fd.getAll('company_ids');
    const btn = $('#psave', body); btn.disabled = true;
    try {
      const res = editing
        ? await api(`/api/problems/${p.problem_id}`, { method: 'PUT', body: payload })
        : await api('/api/problems', { method: 'POST', body: payload });
      closeModal();
      toast(`<b>${esc(res.message)}</b><br><span class="small">rowCount: ${res.rowCount}</span>`, 'ok');
      META = META; // tags are cached; problems list refreshes below
      await loadProblems();
      openProblem(editing ? p.problem_id : res.problem_id);
    } catch (e) {
      $('#pform-err', body).innerHTML = `<div class="note-box warn">${esc(e.message)}</div>`;
      btn.disabled = false;
    }
  };
}

function confirmDelete(p) {
  const body = openModal('Delete this problem?', `
    <p>You are about to run <code>DELETE FROM problems WHERE problem_id = $1</code> for <b>${esc(p.title)}</b> (#${p.problem_id}).</p>
    <div class="note-box">Its topic tags, company tags and test cases go with it (ON DELETE CASCADE). If submissions, contests, editorials, posts or study plans
      still point at it, PostgreSQL will refuse, and you will see why.</div>
    <div id="del-msg" style="margin-top:12px"></div>
    <div class="form-actions"><button class="btn" data-close>Keep it</button><button class="btn danger" id="del-go">${icon.trash} Delete</button></div>`);
  $('#del-go', body).onclick = async () => {
    try {
      const res = await api(`/api/problems/${p.problem_id}`, { method: 'DELETE' });
      closeModal(); closeDrawer();
      toast(`<b>${esc(res.message)}</b><br><span class="small">rowCount: ${res.rowCount}</span>`, 'ok');
      loadProblems();
    } catch (e) {
      $('#del-msg', body).innerHTML = `<div class="note-box warn"><b>${e.status === 409 ? 'Blocked by a foreign key.' : 'Delete failed.'}</b> ${esc(e.message)}</div>`;
      $('#del-go', body).disabled = true;
    }
  };
}

// ---------------------------------------------------------------- Submissions
const sstate = { verdict: '', language: '', username: '', contest_only: '' };
async function pageSubmissions(v) {
  v.innerHTML = head({
    title: 'Submissions & Judge', srs: ['SRS 3', 'SRS 11', 'SRS 12'],
    desc: 'Every verdict is stored as an ENUM. Open a submission to see its code blob (found by SHA-256 hash) and the one failure log the judge wrote for it.',
    sql: ['submissions.list', 'submissions.detail', 'submissions.matrix']
  }) + `<div class="grid g-2-1 mb">
      <section class="card fade-in">
        <div class="filters">
          <div class="seg" id="s-v">${['', 'AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'].map((x) => `<button data-v="${x}" class="${sstate.verdict === x ? 'on' : ''}">${x || 'All'}</button>`).join('')}</div>
          <select class="input" id="s-lang"><option value="">All languages</option>${['C', 'C++', 'Java', 'Python'].map((l) => `<option ${sstate.language === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <div class="search">${icon.search}<input class="input" id="s-user" placeholder="Username…" value="${esc(sstate.username)}" style="width:170px"></div>
          <label class="small muted" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="s-contest" ${sstate.contest_only ? 'checked' : ''}> contest only</label>
        </div>
        <div id="s-table">${loading}</div>
      </section>
      <div class="stack"><div id="s-matrix"></div>
        ${card('How a verdict is logged', `<div class="bars small">
          <div><span class="v v-CE">CE</span> → one <b>compiler_error_logs</b> row</div>
          <div><span class="v v-RE">RE</span> → one <b>runtime_failure_logs</b> row</div>
          <div><span class="v v-WA">WA</span> → one <b>judge_output_logs</b> row</div>
          <div><span class="v v-AC">AC</span> <span class="v v-TLE">TLE</span> <span class="v v-MLE">MLE</span> → no failure log, the verdict is the record</div></div>`, { sub: 'SRS 3' })}
      </div>
    </div>`;
  const reload = () => fill('#s-table', async (el) => {
    const rows = (await q('submissions.list', { ...sstate, contest_only: sstate.contest_only ? 'true' : '' })).rows;
    el.innerHTML = `<div class="t-scroll">${table(rows, [
      { label: 'ID', num: true, render: (r) => `<span class="muted">${r.submission_id}</span>` },
      { label: 'User', render: (r) => `<span class="strong">${esc(r.username)}</span>` },
      { label: 'Problem', wrap: true, render: (r) => `${esc(r.title)} ${r.contest_id ? '<span class="chip ghost">contest</span>' : ''}` },
      { label: 'Lang', key: 'language' }, { label: 'Verdict', render: (r) => verdict(r.verdict) },
      { label: 'Runtime', num: true, render: (r) => (r.runtime_ms === null ? '—' : `${fmtNum(r.runtime_ms)} ms`) }, { label: 'Memory', num: true, render: (r) => (r.memory_usage_mb === null ? '—' : `${fmtNum(r.memory_usage_mb)} MB`) },
      { label: 'When', render: (r) => fmtDate(r.submission_timestamp, true) }
    ], { onRow: true, empty: 'No submissions match.' })}</div><div class="pager"><span>Showing the latest ${rows.length} matching submissions</span></div>`;
    bindRows(el, rows, (r) => openSubmission(r.submission_id));
  });
  $$('#s-v button').forEach((b) => b.addEventListener('click', () => { sstate.verdict = b.dataset.v; $$('#s-v button').forEach((x) => x.classList.toggle('on', x === b)); reload(); }));
  $('#s-lang').onchange = (e) => { sstate.language = e.target.value; reload(); };
  let t; $('#s-user').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { sstate.username = e.target.value.trim(); reload(); }, 250); };
  $('#s-contest').onchange = (e) => { sstate.contest_only = e.target.checked; reload(); };
  reload();
  fill('#s-matrix', async (el) => {
    const rows = (await q('submissions.matrix')).rows;
    el.innerHTML = card('Verdicts by difficulty', table(rows, [
      { label: 'Level', render: (r) => diff(r.difficulty) },
      ...['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'].map((k) => ({ label: k, num: true, key: k })),
      { label: 'AC %', num: true, render: (r) => pct((100 * r.AC) / r.total) }
    ]), { flush: true });
  });
}

async function openSubmission(id) {
  const body = openDrawer(`Submission #${id}`, loading);
  try {
    const s = (await q('submissions.detail', { submission_id: id })).rows[0];
    if (!s) { body.innerHTML = '<div class="empty">Not found.</div>'; return; }
    let log = '<div class="note-box">No failure log: for AC, TLE and MLE the verdict on the submission is the only record (SRS 3).</div>';
    if (s.log_type === 'Compiler') log = `<dl class="kv"><dt>Log</dt><dd>#${s.log_id} · Compiler · exit ${s.exit_code}</dd><dt>Compiler</dt><dd>${esc(s.compiler_version)}</dd></dl><div class="code">${esc(s.full_error_text)}${s.warning_text ? `\n\nwarning: ${esc(s.warning_text)}` : ''}</div>`;
    if (s.log_type === 'Runtime') log = `<dl class="kv"><dt>Log</dt><dd>#${s.log_id} · Runtime · exit ${s.exit_code}</dd><dt>Signal</dt><dd>${esc(s.termination_signal)}</dd><dt>Peak memory / CPU</dt><dd>${fmtNum(s.peak_memory_usage_mb)} MB · ${fmtNum(s.peak_cpu_usage_pct)}%</dd></dl><div class="code">${esc(s.stack_trace || '')}\n${esc(s.standard_error_snippet || '')}</div>`;
    if (s.log_type === 'Judge') log = `<dl class="kv"><dt>Log</dt><dd>#${s.log_id} · Judge · failed on test ${s.test_case_no}</dd><dt>Checker</dt><dd>${esc(s.checker_message)}</dd></dl><div class="grid g2"><div><h4>Expected</h4><div class="code">${esc(s.expected_output)}</div></div><div><h4>Your output</h4><div class="code">${esc(s.actual_output)}</div></div></div>`;
    $('#drawer-title').innerHTML = `Submission #${s.submission_id} ${verdict(s.verdict)}`;
    body.innerHTML = `
      <dl class="kv">
        <dt>User</dt><dd><a href="#/solvers?u=${s.user_id}">${esc(s.username)}</a></dd>
        <dt>Problem</dt><dd>${esc(s.title)} <span class="muted">#${s.problem_id}</span></dd>
        <dt>Verdict</dt><dd>${verdict(s.verdict)} ${esc(VERDICT_NAMES[s.verdict])}</dd>
        <dt>Runtime</dt><dd>${fmtNum(s.runtime_ms)} ms <span class="muted">(limit ${fmtNum(s.time_limit_ms)} ms)</span></dd>
        <dt>Memory</dt><dd>${fmtNum(s.memory_usage_mb)} MB <span class="muted">(limit ${fmtNum(s.memory_limit_mb)} MB)</span></dd>
        <dt>Score</dt><dd>${s.partial_score ?? '—'}</dd>
        <dt>Contest</dt><dd>${esc(s.contest_title || 'Practice')}</dd>
        <dt>Submitted</dt><dd>${fmtDate(s.submission_timestamp, true)}</dd>
        <dt>SHA-256</dt><dd class="mono small">${esc(s.code_hash)} <span class="chip ${s.same_hash_count > 1 ? '' : 'teal'}">${s.same_hash_count} submission(s) share this code</span></dd>
      </dl>
      <div><h4>Failure log · SRS 12</h4>${log}</div>
      <div><h4>Source code · ${esc(s.language)} · from code_blobs (SRS 11)</h4><div class="code">${esc(s.source_code || '')}</div></div>`;
  } catch (e) { body.innerHTML = errorBox(e); }
}

// ---------------------------------------------------------------- Contests
let contestId = null;
async function pageContests(v) {
  v.innerHTML = head({
    title: 'Contests & Leaderboard', srs: ['SRS 4'],
    desc: 'Ranks are read from the pre-calculated <b>participations</b> table, so a leaderboard loads without re-scoring anyone. Pick a contest on the left.',
    sql: ['contests.list', 'contests.leaderboard', 'contests.problems', 'contests.top_rated']
  }) + `<div class="grid g-1-2 mb"><div id="c-list"></div><div class="stack"><div id="c-board"></div><div id="c-probs"></div></div></div>
       <div id="c-top"></div>`;
  fill('#c-list', async (el) => {
    const rows = (await q('contests.list')).rows;
    if (!contestId) contestId = rows.find((r) => r.participants >= 6)?.contest_id || rows[0]?.contest_id;
    el.innerHTML = card('All contests', `<div class="t-scroll" style="max-height:760px">${table(rows, [
      { label: 'Contest', render: (r) => `<span class="strong">${esc(r.title)}</span><div class="small muted">${fmtDate(r.start_time, true)}</div>` },
      { label: 'Type', render: (r) => `<span class="chip ghost">${esc(r.contest_type)}</span>` },
      { label: 'Players', num: true, key: 'participants' }
    ], { onRow: true })}</div>`, { flush: true, sub: `${rows.length} contests` });
    bindRows(el, rows, (r) => { contestId = r.contest_id; loadContest(rows); });
    loadContest(rows);
  });
  fill('#c-top', async (el) => {
    const rows = (await q('contests.top_rated')).rows;
    el.innerHTML = card('Global rating ladder', table(rows, [
      { label: 'Rank', render: (r) => `<span class="rank ${r.global_rank <= 3 ? `r${r.global_rank}` : ''}">${r.global_rank}</span>` },
      { label: 'Solver', render: (r) => `<a href="#/solvers?u=${r.user_id}" class="strong">${esc(r.username)}</a>` },
      { label: 'Country', key: 'country' }, { label: 'Rating', num: true, render: (r) => `<b>${fmtNum(r.contest_rating)}</b>` },
      { label: 'Contests', num: true, key: 'contests_played' }
    ]), { flush: true, sub: 'RANK() over contest_rating' });
  });
}
function loadContest(list) {
  const c = list.find((x) => x.contest_id === contestId) || {};
  fill('#c-board', async (el) => {
    const rows = (await q('contests.leaderboard', { contest_id: contestId })).rows;
    el.innerHTML = card(esc(c.title || 'Leaderboard'), table(rows, [
      { label: 'Rank', render: (r) => (r.disqualification_flag ? '<span class="st st-bad">DQ</span>' : `<span class="rank ${r.current_rank <= 3 ? `r${r.current_rank}` : ''}">${r.current_rank}</span>`) },
      { label: 'Solver', render: (r) => `<a class="strong" href="#/solvers?u=${r.user_id}">${esc(r.username)}</a><div class="small muted">${esc(r.country || '')}</div>` },
      { label: 'Solved', num: true, key: 'problems_solved' }, { label: 'Score', num: true, render: (r) => `<b>${fmtNum(r.total_score)}</b>` },
      { label: 'Penalty', num: true, render: (r) => `${fmtNum(r.time_penalty)} min` },
      { label: 'New rating', num: true, render: (r) => fmtNum(r.new_rating) }
    ], { empty: 'Nobody joined this contest.' }), {
      flush: true,
      sub: `${esc(c.contest_type || '')} · ${fmtDate(c.start_time, true)} · manager ${esc(c.manager || '')} · ${c.ratings_published_at ? 'ratings published' : 'ratings pending'}`
    });
  });
  fill('#c-probs', async (el) => {
    const rows = (await q('contests.problems', { contest_id: contestId })).rows;
    el.innerHTML = card('Problem set', table(rows, [
      { label: '#', render: (r) => `<span class="chip ink">${String.fromCharCode(64 + r.display_order)}</span>` },
      { label: 'Problem', render: (r) => `<span class="strong">${esc(r.title)}</span>` }, { label: 'Level', render: (r) => diff(r.difficulty) },
      { label: 'Points', num: true, key: 'point_value' }, { label: 'Attempts', num: true, key: 'attempts' }, { label: 'Solved by', num: true, key: 'solved_by' }
    ], { empty: 'No problems linked.' }), { flush: true, sub: 'contest_problems' });
  });
}

// ---------------------------------------------------------------- Solvers
async function pageSolvers(v, params) {
  const uid = Number(params.get('u')) || 64;
  v.innerHTML = head({
    title: 'Solver Progress', srs: ['SRS 5', 'SRS 4', 'SRS 10'],
    desc: 'Streaks, solved counts and topic accuracy for one user, plus their rating graph, badges and what to practise next.',
    sql: ['users.profile', 'users.solved_split', 'users.mastery', 'users.rating', 'users.suggest']
  }) + `<div class="grid g-1-2 mb">
      <div class="stack">
        <section class="card"><div class="filters"><div class="search" style="flex:1">${icon.search}<input class="input" id="u-q" placeholder="Find a user by name or id…" style="width:100%"></div></div>
          <div id="u-list">${loading}</div></section>
        <div id="u-streaks"></div>
      </div>
      <div class="stack" id="u-profile">${loading}</div>
    </div>`;
  const search = (term) => fill('#u-list', async (el) => {
    const rows = (await q('users.search', { q: term })).rows;
    el.innerHTML = `<div class="t-scroll" style="max-height:380px">${table(rows, [
      { label: 'User', render: (r) => `<span class="strong">${esc(r.username)}</span> <span class="muted small">#${r.user_id}</span>` },
      { label: 'Rating', num: true, render: (r) => fmtNum(r.contest_rating) }
    ], { onRow: true, empty: 'No user found.' })}</div>`;
    bindRows(el, rows, (r) => { location.hash = `#/solvers?u=${r.user_id}`; });
  });
  let t; $('#u-q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => search(e.target.value.trim()), 250); };
  search('');
  fill('#u-streaks', async (el) => {
    const rows = (await q('users.streak_leaders')).rows;
    el.innerHTML = card('Longest live streaks', bars(rows.map((r) => ({ label: r.username, value: r.current_daily_streak })), { labelW: 120, color: 'var(--teal)', fmt: (x) => `${x} d` }), { sub: 'solvers.current_daily_streak' });
  });
  loadProfile(uid);
}

async function loadProfile(uid) {
  const host = $('#u-profile');
  try {
    const [prof, split, mastery, badges, rating, recent, suggest, follow] = await Promise.all([
      q('users.profile', { user_id: uid }), q('users.solved_split', { user_id: uid }), q('users.mastery', { user_id: uid }),
      q('users.badges', { user_id: uid }), q('users.rating', { user_id: uid }), q('users.recent', { user_id: uid }),
      q('users.suggest', { user_id: uid }), q('community.suggest_follow', { user_id: uid })
    ]);
    const u = prof.rows[0];
    if (!u) { host.innerHTML = '<div class="card empty">User not found.</div>'; return; }
    const col = { Easy: 'var(--easy)', Medium: 'var(--medium)', Hard: 'var(--hard)' };
    host.innerHTML = `
      <section class="card fade-in">
        <div class="profile-head"><div class="avatar">${initials(u.username)}</div>
          <div><h2>${esc(u.username)}</h2><div class="muted small">#${u.user_id} · ${esc(u.country || '—')} · joined ${fmtDate(u.registration_date)} · last seen ${fmtDate(u.last_login_timestamp)}</div>
          <div class="pill-row">${(u.roles || []).map((r) => `<span class="chip ink">${esc(r)}</span>`).join('')}${u.subscription ? `<span class="chip">${esc(u.subscription)}</span>` : ''}</div></div></div>
        <div class="stat-strip">
          <div><b>${fmtNum(u.contest_rating)}</b><span>contest rating</span></div>
          <div><b>${fmtNum(u.current_daily_streak)}</b><span>day streak</span></div>
          <div><b>${fmtNum(u.total_problems_solved)}</b><span>problems solved</span></div>
          <div><b>${fmtNum(u.submissions)}</b><span>submissions · ${pct(u.acceptance_pct)} AC</span></div>
          <div><b>${fmtNum(u.contribution_point)}</b><span>reputation</span></div>
          <div><b>${fmtNum(u.followers)} / ${fmtNum(u.following)}</b><span>followers / following</span></div>
        </div>
      </section>
      <div class="grid g2">
        ${card('Accepted, by difficulty', `<div class="ring-row">${split.rows.map((r) => `<div class="ring" style="--p:${r.total ? (100 * r.solved) / r.total : 0};--c:${col[r.difficulty]}"><span><b>${r.solved}</b>${esc(r.difficulty)} / ${r.total}</span></div>`).join('')}</div>
          <div class="small muted" style="margin-top:10px">Distinct problems with an AC verdict in <b>submissions</b>.</div>`, { sub: 'SRS 5' })}
        ${card('Topic accuracy', mastery.rows.length ? bars(mastery.rows.slice(0, 8).map((r) => ({ label: r.topic_name, value: r.topic_accuracy })), { max: 100, fmt: (x) => `${x.toFixed(0)}%`, labelW: 130 }) : '<div class="empty">No topic_mastery rows yet.</div>', { sub: 'topic_mastery' })}
      </div>
      ${card('Rating graph', rating.rows.length ? `${lineChart(rating.rows.map((r) => ({ y: r.new_rating, label: r.contest, short: fmtDate(r.contest_date).replace(/^\d+ /, '') })))}
        ${table(rating.rows.slice().reverse().slice(0, 5), [{ label: 'Contest', key: 'contest' }, { label: 'Rank', num: true, key: 'platform_rank' }, { label: 'Rating', num: true, key: 'new_rating' },
          { label: 'Change', num: true, render: (r) => (r.change === null ? '—' : `<b style="color:${r.change >= 0 ? 'var(--easy)' : 'var(--hard)'}">${r.change >= 0 ? '+' : ''}${r.change}</b>`) }])}` : '<div class="empty">No rated contests yet.</div>', { sub: 'rating_history with LAG()' })}
      <div class="grid g2">
        ${card('Recent submissions', table(recent.rows, [{ label: 'Problem', wrap: true, render: (r) => esc(r.title) }, { label: 'Verdict', render: (r) => verdict(r.verdict) }, { label: 'When', render: (r) => fmtDate(r.submission_timestamp) }], { onRow: true, empty: 'No submissions.' }), { flush: true })}
        ${card('Badges', badges.rows.length ? `<div class="thread">${badges.rows.map((b) => `<div class="cmt"><span class="who">${esc(b.badge_name)}</span> <span class="chip ${b.category === 'Streak' ? 'teal' : ''}">${esc(b.category)}</span><span class="when">${fmtDate(b.award_date)}</span><p class="small muted">${esc(b.badge_description)}</p></div>`).join('')}</div>` : '<div class="empty">No badges yet.</div>', { sub: 'user_badges · SRS 10' })}
      </div>
      <div class="grid g2">
        ${card('Practise next', suggest.rows.length ? table(suggest.rows, [{ label: 'Weak topic', wrap: true, render: (r) => `${esc(r.topic_name)} <span class="muted small">${pct(r.topic_accuracy)}</span>` }, { label: 'Problem', wrap: true, render: (r) => esc(r.title) }, { label: 'Level', render: (r) => diff(r.difficulty) }]) : '<div class="empty">No weak-topic suggestions for this user.</div>', { flush: true, sub: 'lowest topic accuracy, not yet solved' })}
        ${card('People to follow', follow.rows.length ? table(follow.rows, [{ label: 'User', render: (r) => `<a href="#/solvers?u=${r.user_id}" class="strong">${esc(r.username)}</a>` }, { label: 'Country', key: 'country' }, { label: 'Via', num: true, render: (r) => `${r.followed_by_my_followees} mutual` }]) : '<div class="empty">No suggestions from this user\'s network.</div>', { flush: true, sub: 'followed by people they follow · SRS 8' })}
      </div>`;
    const recentCard = $$('.card', host).find((c) => c.textContent.includes('Recent submissions'));
    if (recentCard) bindRows(recentCard, recent.rows, (r) => openSubmission(r.submission_id));
  } catch (e) { host.innerHTML = errorBox(e); }
}

// ---------------------------------------------------------------- Premium
async function pagePremium(v) {
  v.innerHTML = head({
    title: 'Premium & Access', srs: ['SRS 6'],
    desc: 'Subscriptions, their payment history, and the gating rules that decide who can open which feature. Try the access checker.',
    sql: ['premium.summary', 'premium.expiring', 'premium.revenue', 'premium.rules', 'premium.access_check']
  }) + `<div class="grid g3 mb"><div id="pr-sum"></div><div id="pr-rev" class="span-2"></div></div>
    <div class="grid g2 mb"><div id="pr-check"></div><div id="pr-exp"></div></div>
    <div class="grid g2"><div id="pr-rules"></div><div id="pr-pay"></div></div>`;
  fill('#pr-sum', async (el) => {
    const rows = (await q('premium.summary')).rows;
    const palette = ['#e09f3e', '#1b6f6a', '#9e2a2b', '#2c6e9b', '#5b3f8c', '#8a8f98', '#c8553d', '#2a9d8f'];
    const total = rows.reduce((s, r) => s + r.subscriptions, 0);
    el.innerHTML = card('Subscriptions', donut(rows.map((r, i) => ({ label: `${r.tier} · ${r.status}`, value: r.subscriptions, color: palette[i % palette.length] })), total, 'records'), { sub: 'tier × status' });
  });
  fill('#pr-rev', async (el) => {
    const rows = (await q('premium.revenue')).rows.reverse();
    el.innerHTML = card('Monthly revenue (successful payments)', `${columns(rows.map((r) => ({ label: r.month.slice(2), value: r.inr + r.usd * 84, show: `₹${(r.inr / 1000).toFixed(1)}k`, label2: r.usd })))}
      <div class="small muted">Labels show INR. Bar height adds USD × 84 only to compare months; each amount stays in its own currency in <b>payments</b>.</div>`, { sub: 'last 12 months with payments' });
  });
  fill('#pr-exp', async (el) => {
    const draw = async (days) => {
      const rows = (await q('premium.expiring', { days })).rows;
      $('#pr-exp-body').innerHTML = table(rows, [
        { label: 'User', render: (r) => `<span class="strong">${esc(r.username)}</span>` }, { label: 'Ends', render: (r) => fmtDate(r.end_date) },
        { label: 'Left', num: true, render: (r) => `${r.days_left} d` }, { label: 'Auto-renew', render: (r) => (r.auto_renewal_flag ? '<span class="st st-good">on</span>' : '<span class="st st-warn">off</span>') },
        { label: 'Status', render: (r) => status(r.status) }
      ], { empty: 'No Premium plan ends in this window.' });
    };
    el.innerHTML = card('Renewal reminders', '<div id="pr-exp-body"></div>', { flush: true, sub: 'Premium plans ending soon', tools: `<div class="seg" id="pr-days">${[15, 30, 60, 90].map((d) => `<button data-d="${d}" class="${d === 30 ? 'on' : ''}">${d}d</button>`).join('')}</div>` });
    $$('#pr-days button').forEach((b) => b.onclick = () => { $$('#pr-days button').forEach((x) => x.classList.toggle('on', x === b)); draw(b.dataset.d); });
    await draw(30);
  });
  fill('#pr-rules', async (el) => {
    const rows = (await q('premium.rules')).rows;
    const draw = (lvl) => { $('#pr-rules-body').innerHTML = `<div class="t-scroll">${table(rows.filter((r) => !lvl || r.level === lvl), [
      { label: 'Feature', render: (r) => `<span class="strong">${esc(r.feature_name)}</span>` }, { label: 'Needs', render: (r) => level(r.level) },
      { label: 'Problems', num: true, key: 'problems' }, { label: 'Editorials', num: true, key: 'editorials' }
    ])}</div>`; };
    el.innerHTML = card('Feature gating rules', '<div id="pr-rules-body"></div>', { flush: true, sub: `${rows.length} rules`, tools: `<div class="seg" id="pr-lvl">${[['', 'All'], ['Free', 'Free'], ['Registered', 'Reg.'], ['Premium_Only', 'Premium']].map(([k, l]) => `<button data-l="${k}" class="${k ? '' : 'on'}">${l}</button>`).join('')}</div>` });
    $$('#pr-lvl button').forEach((b) => b.onclick = () => { $$('#pr-lvl button').forEach((x) => x.classList.toggle('on', x === b)); draw(b.dataset.l); });
    draw('');
    // access checker needs the rules too
    $('#pr-check').innerHTML = card('Access checker', `
      <div class="filters" style="padding:0 0 12px;border:0">
        <input class="input" id="ac-user" type="number" value="103" min="1" style="width:110px" title="user_id">
        <select class="input" id="ac-rule" style="flex:1;min-width:200px">${rows.map((r) => `<option value="${r.rule_id}" ${r.rule_id === 31 ? 'selected' : ''}>${esc(r.feature_name)} · ${esc(r.level.replace('_', ' '))}</option>`).join('')}</select>
        <button class="btn primary" id="ac-go">${icon.lock} Check</button>
      </div><div id="ac-out"><div class="muted small">Pick a user id and a feature. The database compares the user's latest subscription with the rule (as of 17 Oct 2026).</div></div>`, { sub: 'subscriptions × feature_gating_rules' });
    const check = async () => {
      const out = $('#ac-out');
      try {
        const r = (await q('premium.access_check', { user_id: $('#ac-user').value, rule_id: $('#ac-rule').value })).rows[0];
        if (!r) { out.innerHTML = '<div class="note-box warn">No user with that id.</div>'; return; }
        out.innerHTML = `<div class="access ${r.allowed ? 'yes' : 'no'}"><div class="big">${r.allowed ? icon.check : icon.lock}</div>
          <div><b>${r.allowed ? 'Access granted' : 'Locked'}</b> for <b>${esc(r.username)}</b> on “${esc(r.feature_name)}”.<br>
          <span class="small muted">Feature needs ${esc(r.needs.replace('_', ' '))} · user plan: ${esc(r.tier)}${r.status ? ` (${esc(r.status)}, ends ${fmtDate(r.end_date)})` : ''}</span></div></div>`;
      } catch (e) { out.innerHTML = errorBox(e); }
    };
    $('#ac-go').onclick = check; check();
  });
  fill('#pr-pay', async (el) => {
    const rows = (await q('premium.payments')).rows;
    el.innerHTML = card('Latest payments', table(rows, [
      { label: 'User', key: 'username' }, { label: 'Amount', num: true, render: (r) => `${r.currency === 'INR' ? '₹' : '$'}${fmtNum(r.amount, 2)}` },
      { label: 'Method', key: 'payment_method' }, { label: 'Status', render: (r) => status(r.status) }, { label: 'Date', render: (r) => fmtDate(r.payment_date) }
    ]), { flush: true, sub: 'payments' });
  });
}

// ---------------------------------------------------------------- Companies & editorials
let companyId = null;
async function pageCompanies(v) {
  v.innerHTML = head({
    title: 'Companies & Editorials', srs: ['SRS 7'],
    desc: 'Which companies ask which problems, how often (dated snapshots that are never overwritten), and the official editorials with code snippets.',
    sql: ['companies.list', 'companies.snapshots', 'companies.problems', 'editorials.list', 'editorials.detail']
  }) + `<div class="grid g-1-2 mb"><div id="co-list"></div><div class="stack"><div id="co-snap"></div><div id="co-probs"></div></div></div><div id="ed-list"></div>`;
  fill('#co-list', async (el) => {
    const rows = (await q('companies.list')).rows;
    if (!companyId) companyId = rows[0]?.company_id;
    el.innerHTML = card('Companies', `<div class="t-scroll" style="max-height:720px">${table(rows, [
      { label: 'Company', render: (r) => `<span class="strong">${esc(r.company_name)}</span><div class="small muted">${esc(r.industry || '')}</div>` },
      { label: '90-day', num: true, render: (r) => fmtNum(r.freq_90d) }, { label: 'Problems', num: true, key: 'problems' }
    ], { onRow: true })}</div>`, { flush: true, sub: 'sorted by latest 90-day frequency' });
    bindRows(el, rows, (r) => { companyId = r.company_id; loadCompany(rows); });
    loadCompany(rows);
  });
  fill('#ed-list', async (el) => {
    const rows = (await q('editorials.list')).rows;
    el.innerHTML = card('Editorials', `<div class="t-scroll">${table(rows, [
      { label: 'Problem', render: (r) => `<span class="strong">${esc(r.title)}</span>` }, { label: 'Time', render: (r) => `<span class="mono">${esc(r.time_complexity)}</span>` },
      { label: 'Space', render: (r) => `<span class="mono">${esc(r.space_complexity)}</span>` }, { label: 'Snippets', render: (r) => `<span class="small">${esc(r.languages || '—')}</span>` },
      { label: 'Status', render: (r) => status(r.status) }, { label: 'Views', num: true, render: (r) => fmtNum(r.view_count) },
      { label: 'Helpful', num: true, render: (r) => (r.helpfulness_rating ?? '—') }
    ], { onRow: true })}</div>`, { flush: true, sub: 'most viewed first · click to read' });
    bindRows(el, rows, (r) => openEditorial(r.editorial_id));
  });
}
function loadCompany(list) {
  const c = list.find((x) => x.company_id === companyId) || {};
  fill('#co-snap', async (el) => {
    const rows = (await q('companies.snapshots', { company_id: companyId })).rows;
    const dates = [...new Set(rows.map((r) => r.snapshot_date))];
    const by = (w) => dates.map((d) => rows.find((r) => r.snapshot_date === d && r.window_days === w)?.frequency_count ?? 0);
    el.innerHTML = card(`${esc(c.company_name || '')} · question frequency`, `
      <div class="grid g3">${[30, 90, 180].map((w, i) => `<div><div class="small muted" style="font-weight:700">${w}-day window</div>${columns(dates.map((d, k) => ({ label: fmtDate(d).replace(/^\d+ /, ''), value: by(w)[k] })), { alt: i === 1 })}</div>`).join('')}</div>
      <div class="small muted">Each bar is one row of <b>frequency_snapshots</b>, keyed by (company_id, snapshot_date, window_days).</div>`, { sub: `trending score ${fmtNum(c.dynamic_trending_score)}` });
  });
  fill('#co-probs', async (el) => {
    const rows = (await q('companies.problems', { company_id: companyId })).rows;
    el.innerHTML = card('Problems asked', table(rows, [
      { label: 'Problem', render: (r) => `<span class="strong">${esc(r.title)}</span>` }, { label: 'Level', render: (r) => diff(r.difficulty) },
      { label: 'Acceptance', num: true, render: (r) => pct(r.global_acceptance_rate) }, { label: 'Access', render: (r) => level(r.access) }
    ], { onRow: true, empty: 'No problems tagged.' }), { flush: true, sub: 'problem_companies' });
    bindRows(el, rows, (r) => openProblem(r.problem_id));
  });
}
async function openEditorial(id) {
  const body = openDrawer('Editorial', loading);
  try {
    const rows = (await q('editorials.detail', { editorial_id: id })).rows;
    const e = rows[0];
    $('#drawer-title').innerHTML = `Editorial · ${esc(e.title)}`;
    body.innerHTML = `<div class="pill-row"><span class="chip teal">Time ${esc(e.time_complexity)}</span><span class="chip">Space ${esc(e.space_complexity)}</span></div>
      <div><h4>Solution</h4><p style="margin:0;white-space:pre-wrap">${esc(e.solution_text)}</p></div>
      ${rows.filter((r) => r.snippet_no).map((r) => `<div><h4>Snippet ${r.snippet_no} · ${esc(r.programming_language)}</h4><div class="code">${esc(r.code_snippet)}</div></div>`).join('')}`;
  } catch (err) { body.innerHTML = errorBox(err); }
}

// ---------------------------------------------------------------- Community
const cstate = { sort: 'top', q: '' };
async function pageCommunity(v) {
  v.innerHTML = head({
    title: 'Discussions', srs: ['SRS 8'],
    desc: 'Solution posts with their reactions, comments and threaded replies. Reputation comes from users.contribution_point.',
    sql: ['community.posts', 'community.post', 'community.comments', 'community.contributors']
  }) + `<div class="grid g-2-1"><section class="card fade-in">
      <div class="filters"><div class="seg" id="cm-sort">${[['top', 'Top voted'], ['discussed', 'Most discussed'], ['new', 'Newest']].map(([k, l]) => `<button data-k="${k}" class="${cstate.sort === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="search">${icon.search}<input class="input" id="cm-q" placeholder="Search posts or problems…" value="${esc(cstate.q)}"></div></div>
      <div id="cm-list">${loading}</div></section>
      <div id="cm-top"></div></div>`;
  const reload = () => fill('#cm-list', async (el) => {
    const rows = (await q('community.posts', cstate)).rows;
    el.innerHTML = `<div class="t-scroll" style="max-height:720px">${table(rows, [
      { label: 'Post', wrap: true, render: (r) => `<span class="strong">${esc(r.title)}</span><div class="small muted">${esc(r.author)} · ${esc(r.problem || '')} · ${fmtDate(r.creation_timestamp)}</div>` },
      { label: '▲', num: true, render: (r) => `<b style="color:var(--easy)">${r.upvotes}</b>` }, { label: '▼', num: true, render: (r) => `<span class="muted">${r.downvotes}</span>` },
      { label: 'Saved', num: true, key: 'bookmarks' }, { label: 'Comments', num: true, key: 'comments' }, { label: 'Status', render: (r) => status(r.status) }
    ], { onRow: true, empty: 'No posts match.' })}</div>`;
    bindRows(el, rows, (r) => openPost(r.post_id));
  });
  $$('#cm-sort button').forEach((b) => b.onclick = () => { cstate.sort = b.dataset.k; $$('#cm-sort button').forEach((x) => x.classList.toggle('on', x === b)); reload(); });
  let t; $('#cm-q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { cstate.q = e.target.value.trim(); reload(); }, 250); };
  reload();
  fill('#cm-top', async (el) => {
    const rows = (await q('community.contributors')).rows;
    el.innerHTML = card('Top contributors', table(rows, [
      { label: 'User', render: (r) => `<a class="strong" href="#/solvers?u=${r.user_id}">${esc(r.username)}</a><div class="small muted">${esc(r.country || '')}</div>` },
      { label: 'Rep.', num: true, render: (r) => `<b>${fmtNum(r.contribution_point)}</b>` }, { label: 'Followers', num: true, key: 'followers' }
    ]), { flush: true, sub: 'by reputation points' });
  });
}
async function openPost(id) {
  const body = openDrawer('Post', loading);
  try {
    const [pp, cc] = await Promise.all([q('community.post', { post_id: id }), q('community.comments', { post_id: id })]);
    const p = pp.rows[0];
    const byParent = {};
    cc.rows.forEach((c) => { (byParent[c.parent_comment_id ?? 'root'] ||= []).push(c); });
    const render = (c) => `<div class="cmt"><span class="who">${esc(c.username)}</span><span class="when">${fmtDate(c.comment_timestamp, true)}</span><p>${esc(c.comment_body)}</p>
      ${(byParent[c.comment_id] || []).length ? `<div class="replies">${byParent[c.comment_id].map(render).join('')}</div>` : ''}</div>`;
    $('#drawer-title').innerHTML = esc(p.title);
    body.innerHTML = `<div class="pill-row"><span class="chip ink">${esc(p.author)}</span>${p.problem ? `<span class="chip teal">${esc(p.problem)}</span>` : ''}<span class="chip ghost">${esc(p.language || '')}</span>${status(p.status)}</div>
      <p style="margin:0;white-space:pre-wrap">${esc(p.body_text)}</p>
      ${p.code_snippet ? `<div class="code">${esc(p.code_snippet)}</div>` : ''}
      ${p.time_complexity_analysis ? `<div><h4>Complexity</h4>${esc(p.time_complexity_analysis)}</div>` : ''}
      ${p.edge_case_explanation ? `<div><h4>Edge cases</h4>${esc(p.edge_case_explanation)}</div>` : ''}
      <div><h4>${cc.rows.length} comments · replies are linked through comment_replies</h4><div class="thread">${(byParent.root || []).map(render).join('') || '<span class="muted">No comments yet.</span>'}</div></div>`;
  } catch (e) { body.innerHTML = errorBox(e); }
}

// ---------------------------------------------------------------- Moderation
async function pageModeration(v) {
  v.innerHTML = head({
    title: 'Moderation', srs: ['SRS 9'],
    desc: 'Any user can report a post. Moderation leads close reports with reviews, and no review is ever deleted, so the full history stays.',
    sql: ['moderation.queue', 'moderation.history', 'moderation.reasons', 'moderation.workload']
  }) + `<div class="grid g4 mb" id="md-kpi"></div>
    <div class="grid g-2-1 mb"><div id="md-queue"></div><div id="md-reasons"></div></div>
    <div class="grid g-2-1"><div id="md-hist"></div><div id="md-work"></div></div>`;
  fill('#md-queue', async (el) => {
    const [queue, hist] = await Promise.all([q('moderation.queue'), q('moderation.history')]);
    const rows = queue.rows;
    const hrs = hist.rows.map((r) => r.hours_to_close);
    $('#md-kpi').innerHTML = kpi('Waiting in queue', rows.length, 'reports with no review', 'var(--wine-soft)') +
      kpi('Reviews (latest 40)', hist.rowCount, 'moderator_reviews', 'var(--teal-soft)') +
      kpi('Avg. hours to close', (hrs.reduce((a, b) => a + b, 0) / (hrs.length || 1)).toFixed(1), 'report → review') +
      kpi('Removed', hist.rows.filter((r) => r.decision === 'Removed').length, 'of the latest 40 decisions', 'var(--plum-soft)');
    el.innerHTML = card('Review queue', table(rows, [
      { label: 'Report', render: (r) => `<span class="muted">#${r.report_id}</span>` },
      { label: 'Reason', render: (r) => `<span class="chip">${esc(r.reason.replace('_', ' '))}</span>` },
      { label: 'Post', wrap: true, render: (r) => `<span class="strong">${esc(r.post_title)}</span><div class="small muted">by ${esc(r.post_author)} · reported by ${esc(r.reporter)}</div>` },
      { label: 'Reported', render: (r) => fmtDate(r.report_timestamp, true) }, { label: 'Post status', render: (r) => status(r.post_status) }
    ], { onRow: true, empty: 'Queue is empty.' }), { flush: true, sub: 'LEFT JOIN … WHERE review IS NULL' });
    bindRows(el, rows, (r) => openPost(r.post_id));
    $('#md-hist').innerHTML = card('Review history', `<div class="t-scroll">${table(hist.rows, [
      { label: 'Report', render: (r) => `#${r.report_id}` }, { label: 'Moderator', key: 'moderator' },
      { label: 'Action', wrap: true, key: 'action_taken' }, { label: 'Decision', render: (r) => status(r.decision) },
      { label: 'Hours', num: true, key: 'hours_to_close' }
    ])}</div>`, { flush: true, sub: 'newest first' });
  });
  fill('#md-reasons', async (el) => {
    const rows = (await q('moderation.reasons')).rows;
    el.innerHTML = card('Why posts get reported', `${bars(rows.map((r) => ({ label: r.reason.replace('_', ' '), value: r.reports })), { color: 'var(--wine)', labelW: 120 })}
      <div style="margin-top:14px">${table(rows, [{ label: 'Reason', render: (r) => esc(r.reason.replace('_', ' ')) }, { label: 'Removed', num: true, key: 'removed' }, { label: 'Kept', num: true, key: 'kept' }])}</div>`, { sub: 'flag_reports' });
  });
  fill('#md-work', async (el) => {
    const rows = (await q('moderation.workload')).rows;
    el.innerHTML = card('Moderator workload', table(rows, [
      { label: 'Moderator', render: (r) => `<span class="strong">${esc(r.moderator)}</span>` }, { label: 'Reviews', num: true, key: 'reviews' },
      { label: 'Avg h', num: true, key: 'avg_hours' }, { label: 'Removed', num: true, key: 'removed' }
    ]), { flush: true });
  });
}

// ---------------------------------------------------------------- Study plans & badges
let planId = null;
async function pagePlans(v) {
  v.innerHTML = head({
    title: 'Study Plans & Badges', srs: ['SRS 10'],
    desc: 'Plans are ordered days of problems; enrolments track how far each learner has got. Badges are stored here, and the backend can use the “due” list to award them.',
    sql: ['plans.list', 'plans.days', 'plans.enrolments', 'badges.list', 'badges.eligible']
  }) + `<div class="grid g-1-2 mb"><div id="pl-list"></div><div class="stack"><div id="pl-days"></div><div id="pl-enr"></div></div></div>
    <div class="grid g3"><div id="bd-list"></div><div id="bd-recent"></div><div id="bd-due"></div></div>`;
  fill('#pl-list', async (el) => {
    const rows = (await q('plans.list')).rows;
    if (!planId) planId = rows[0]?.plan_id;
    el.innerHTML = card('Study plans', `<div class="t-scroll" style="max-height:640px">${table(rows, [
      { label: 'Plan', render: (r) => `<span class="strong">${esc(r.plan_name)}</span><div class="small muted">${r.days} days · ${r.problems} problems</div>` },
      { label: 'Level', render: (r) => diff(r.difficulty) }, { label: 'Enrolled', num: true, key: 'enrolled' }
    ], { onRow: true })}</div>`, { flush: true, sub: `${rows.length} plans` });
    bindRows(el, rows, (r) => { planId = r.plan_id; loadPlan(rows); });
    loadPlan(rows);
  });
  fill('#bd-list', async (el) => {
    const rows = (await q('badges.list')).rows;
    el.innerHTML = card('Badge catalogue', `<div class="t-scroll" style="max-height:420px">${table(rows, [
      { label: 'Badge', render: (r) => `<span class="strong">${esc(r.badge_name)}</span><div class="small muted">${esc(r.unlock_criterion)}</div>` },
      { label: 'Type', render: (r) => `<span class="chip ${r.category === 'Streak' ? 'teal' : r.category === 'Reputation' ? 'ghost' : ''}">${esc(r.category)}</span>` },
      { label: 'Awarded', num: true, key: 'awarded' }
    ])}</div>`, { flush: true });
  });
  fill('#bd-recent', async (el) => {
    const rows = (await q('badges.recent')).rows;
    el.innerHTML = card('Recently awarded', table(rows, [{ label: 'User', key: 'username' }, { label: 'Badge', key: 'badge_name' }, { label: 'Date', render: (r) => fmtDate(r.award_date) }]), { flush: true, sub: 'user_badges' });
  });
  fill('#bd-due', async (el) => {
    const rows = (await q('badges.eligible')).rows;
    el.innerHTML = card('Streak badges due', table(rows, [{ label: 'User', render: (r) => `<a href="#/solvers?u=${r.user_id}">${esc(r.username)}</a>` }, { label: 'Streak', num: true, render: (r) => `${r.current_daily_streak} d` }, { label: 'Due', key: 'badge_due' }]), { flush: true, sub: 'streak ≥ 7, no Streak badge yet' });
  });
}
function loadPlan(list) {
  const p = list.find((x) => x.plan_id === planId) || {};
  fill('#pl-days', async (el) => {
    const rows = (await q('plans.days', { plan_id: planId })).rows;
    const days = {};
    rows.forEach((r) => { (days[r.day_number] ||= []).push(r); });
    el.innerHTML = card(esc(p.plan_name || 'Plan'), `<p class="muted" style="margin-top:0">${esc(p.description || '')}</p>
      <div class="thread">${Object.entries(days).map(([d, ps]) => `<div class="cmt"><span class="who">Day ${d}</span>
        <div class="pill-row">${ps.filter((x) => x.problem_id).map((x) => `<span class="tag d-${esc(x.difficulty)}">${esc(x.title)}</span>`).join('') || '<span class="muted small">Rest day</span>'}</div></div>`).join('')}</div>`,
      { sub: `${p.days} days · ${p.enrolled} enrolled · ${p.completed} completed` });
  });
  fill('#pl-enr', async (el) => {
    const rows = (await q('plans.enrolments', { plan_id: planId })).rows;
    el.innerHTML = card('Learners', table(rows, [
      { label: 'User', render: (r) => `<span class="strong">${esc(r.username)}</span><div class="small muted">${esc(r.goal || '')}</div>` },
      { label: 'Progress', render: (r) => `<div class="bar-track" style="width:140px;display:inline-block;vertical-align:middle"><div class="bar-fill" style="width:${Math.min(100, (100 * r.current_day) / (r.total_days || 1))}%;background:var(--teal)"></div></div> <span class="small">${r.current_day}/${r.total_days}</span>` },
      { label: 'Status', render: (r) => status(r.status) }, { label: 'Since', render: (r) => fmtDate(r.enrolment_date) }
    ], { empty: 'Nobody is enrolled in this plan.' }), { flush: true, sub: 'enrolments' });
  });
}

// ---------------------------------------------------------------- Integrity
async function pageIntegrity(v) {
  v.innerHTML = head({
    title: 'Code Integrity', srs: ['SRS 11', 'SRS 12'],
    desc: 'Source code is stored once per SHA-256 hash, which makes copied contest code easy to spot. Failure logs are kept strictly apart by composite keys (log_id, log_type).',
    sql: ['integrity.dedup', 'integrity.plagiarism', 'integrity.logs', 'integrity.verdict_logs', 'integrity.compilers']
  }) + `<div class="grid g4 mb" id="in-kpi"></div>
    <div id="in-plag" class="mb"></div>
    <div class="grid g2 mb"><div id="in-logs"></div><div id="in-vlogs"></div></div><div id="in-comp"></div>`;
  fill('#in-kpi', async (el) => {
    const d = (await q('integrity.dedup')).rows[0];
    el.innerHTML = kpi('Submissions', fmtNum(d.submissions), 'rows in submissions') +
      kpi('Unique code blobs', fmtNum(d.unique_code_blobs), `${fmtNum(d.submissions - d.unique_code_blobs)} duplicates stored once`, 'var(--teal-soft)') +
      kpi('Shared hashes', fmtNum(d.hashes_shared_by_users), 'same code, different users', 'var(--wine-soft)') +
      kpi('Storage saved', `${fmtNum(d.kb_without_dedup - d.stored_kb, 1)} KB`, `${fmtNum(d.stored_kb, 1)} KB kept instead of ${fmtNum(d.kb_without_dedup, 1)} KB`, 'var(--plum-soft)');
  });
  fill('#in-plag', async (el) => {
    const rows = (await q('integrity.plagiarism')).rows;
    el.innerHTML = card('Identical code inside a contest', table(rows, [
      { label: 'Contest', render: (r) => `<span class="strong">${esc(r.contest)}</span>` }, { label: 'Problem', key: 'problem' },
      { label: 'SHA-256 prefix', render: (r) => `<span class="mono small">${esc(r.hash_prefix)}…</span>` },
      { label: 'Users', wrap: true, render: (r) => `<span class="chip">${r.users_sharing}</span> ${esc(r.usernames)}` },
      { label: 'First seen', render: (r) => fmtDate(r.first_seen, true) }
    ], { empty: 'No shared code found.' }), { flush: true, sub: 'first-pass plagiarism filter · GROUP BY code_hash HAVING COUNT(DISTINCT user_id) > 1' });
  });
  fill('#in-logs', async (el) => {
    const rows = (await q('integrity.logs')).rows;
    const broken = rows.reduce((s, r) => s + r.broken_rows, 0);
    el.innerHTML = card('Disjoint failure logs', `${table(rows, [
      { label: 'log_type', render: (r) => `<span class="chip ink">${esc(r.log_type)}</span>` }, { label: 'failure_logs', num: true, key: 'failure_logs' },
      { label: 'compiler', num: true, key: 'compiler_rows' }, { label: 'runtime', num: true, key: 'runtime_rows' }, { label: 'judge', num: true, key: 'judge_rows' }
    ])}<div class="access ${broken ? 'no' : 'yes'}" style="margin:14px 18px 18px"><div class="big">${broken ? icon.lock : icon.check}</div>
      <div><b>${broken ? `${broken} log(s) break the rule` : 'Every log belongs to exactly one subclass table'}</b><br><span class="small muted">A compiler log can never also be a runtime or judge log: the subclass key (log_id, log_type) must match the parent.</span></div></div>`,
    { flush: true, sub: 'SRS 12' });
  });
  fill('#in-vlogs', async (el) => {
    const rows = (await q('integrity.verdict_logs')).rows;
    el.innerHTML = card('Which verdicts write a log', table(rows, [
      { label: 'Verdict', render: (r) => `${verdict(r.verdict)} <span class="small muted">${esc(VERDICT_NAMES[r.verdict])}</span>` },
      { label: 'Submissions', num: true, key: 'submissions' }, { label: 'With log', num: true, key: 'with_failure_log' },
      { label: 'Log type', render: (r) => esc(r.log_types || '—') }
    ]), { flush: true, sub: 'SRS 3' });
  });
  fill('#in-comp', async (el) => {
    const rows = (await q('integrity.compilers')).rows;
    el.innerHTML = card('Compile errors by toolchain', bars(rows.map((r) => ({ label: `${r.language} · ${r.compiler_version}`, value: r.compile_errors })), { labelW: 220, color: 'var(--plum)' }), { sub: 'compiler_error_logs ⋈ failure_logs ⋈ submissions' });
  });
}

// ---------------------------------------------------------------- Query Lab
let LAB = null; let labSel = 1;
async function pageQueryLab(v) {
  v.innerHTML = head({
    title: 'Query Lab', srs: ['Lab 10A', '30 queries'],
    desc: 'The 30 English + SQL queries from Lab 10A, from simple filters to window functions, recursive CTEs and a stored function. Pick one and run it on the live database.'
  }) + `<div class="grid g-1-2"><section class="card"><div class="card-head"><h3>Queries</h3><span class="sub" id="lab-count"></span></div><div class="qlist" id="lab-list">${loading}</div></section>
    <div class="stack" id="lab-run"></div></div>`;
  try {
    LAB = LAB || await api('/api/lab10a');
    $('#lab-count').textContent = `${LAB.filter((x) => x.kind !== 'Simple' && x.kind !== 'Moderate').length} complex of ${LAB.length}`;
    const list = $('#lab-list');
    list.innerHTML = LAB.map((x) => `<div class="qitem ${x.id === labSel ? 'on' : ''}" data-id="${x.id}"><span class="n">${x.id}</span><div><div class="t">${esc(x.title)}</div><div class="k">${esc(x.kind)} · ${esc(x.srs)}</div></div></div>`).join('');
    $$('.qitem', list).forEach((el) => el.onclick = () => { labSel = Number(el.dataset.id); $$('.qitem', list).forEach((x) => x.classList.toggle('on', x === el)); showLab(); });
    showLab();
  } catch (e) { $('#lab-list').innerHTML = errorBox(e); }
}
function showLab() {
  const x = LAB.find((i) => i.id === labSel);
  $('#lab-run').innerHTML = `<section class="card fade-in"><div class="card-head"><h3>Query ${x.id}: ${esc(x.title)}</h3><div class="tools"><span class="chip">${esc(x.kind)}</span></div></div>
    <div class="card-body"><p style="margin-top:0">${esc(x.english)}</p>
      <div class="code">${highlightSQL((x.pre ? `${x.pre}\n\n` : '') + x.sql)}</div>
      <div style="margin-top:12px;display:flex;gap:10px;align-items:center"><button class="btn accent" id="lab-go">${icon.play} Run query</button><span class="small muted" id="lab-meta"></span></div></div></section>
    <div id="lab-out"></div>`;
  $('#lab-go').onclick = runLab;
  runLab();
}
async function runLab() {
  const out = $('#lab-out');
  out.innerHTML = `<section class="card">${loading}</section>`;
  try {
    const r = await api(`/api/lab10a/${labSel}`);
    $('#lab-meta').textContent = `${r.rowCount} row(s) · ${r.fields.length} column(s) · ${r.ms} ms`;
    out.innerHTML = card('Data output', `<div class="t-scroll">${autoTable(r.rows, r.fields)}</div>${r.rowCount > r.rows.length ? `<div class="pager">Showing the first ${r.rows.length} of ${r.rowCount} rows</div>` : ''}`, { flush: true, sub: `Total rows: ${r.rowCount}` });
  } catch (e) { out.innerHTML = errorBox(e); }
}

// ---------------------------------------------------------------- Connection & schema
async function pageConnection(v) {
  v.innerHTML = head({
    title: 'Connection & Schema', srs: ['Lab 11', 'Connectivity'],
    desc: 'How this page reaches PostgreSQL, and a live row count of all 42 tables.', sql: ['overview.tables']
  }) + `<div class="grid g2 mb"><div id="cn-health"></div>
    ${card('Request path', `<div class="flow">
      <div class="node">Browser<small>HTML + fetch()</small></div><span class="arrow">→</span>
      <div class="node">Express API<small>/api/… routes</small></div><span class="arrow">→</span>
      <div class="node">node-postgres<small>new Pool() · $1, $2</small></div><span class="arrow">→</span>
      <div class="node">PostgreSQL 16<small>42 tables · BCNF</small></div></div>
      <ul class="small" style="margin:16px 0 0;padding-left:18px;line-height:1.8">
        <li>The browser never connects to PostgreSQL and never sees the password.</li>
        <li>Every value from a form or filter is sent as a placeholder (<code>$1</code>, <code>$2</code> …), never glued into the SQL text.</li>
        <li>Connection settings live in <code>.env</code> (local) or Netlify environment variables (deployed), never in Git.</li>
        <li>Every UPDATE and DELETE has a WHERE clause on the primary key.</li></ul>`, { sub: 'UI ↔ code ↔ database' })}</div>
    <div id="cn-tables"></div>`;
  fill('#cn-health', async (el) => {
    const h = await api('/api/health');
    el.innerHTML = card('Live connection', `<div class="access yes" style="margin-top:0"><div class="big">${icon.check}</div><div><b>Connected</b> in ${h.ms} ms<br><span class="small muted">${esc(h.mode)}</span></div></div>
      <dl class="kv" style="margin-top:16px"><dt>SELECT version()</dt><dd class="mono small">${esc(h.version)}</dd><dt>Database</dt><dd>${esc(h.database)}</dd><dt>DB user</dt><dd>${esc(h.db_user)}</dd><dt>Tables</dt><dd>${h.tables}</dd></dl>`, { sub: '/api/health' });
  });
  fill('#cn-tables', async (el) => {
    const rows = (await q('overview.tables')).rows;
    const total = rows.reduce((s, r) => s + r.row_count, 0);
    el.innerHTML = card(`All tables · ${fmtNum(total)} rows`, `<div class="grid g2">${[rows.slice(0, 21), rows.slice(21)].map((part) => bars(part.map((r) => ({ label: r.table_name, value: r.row_count })), { labelW: 170, max: rows[0].row_count, color: 'var(--teal)' })).join('')}</div>`, { sub: 'exact COUNT(*) per table' });
  });
}

// ---------------------------------------------------------------- router & shell
const PAGES = {
  overview: pageOverview, problems: pageProblems, submissions: pageSubmissions, contests: pageContests, solvers: pageSolvers,
  premium: pagePremium, companies: pageCompanies, community: pageCommunity, moderation: pageModeration, plans: pagePlans,
  integrity: pageIntegrity, querylab: pageQueryLab, connection: pageConnection
};
function route() {
  const [path, qs] = (location.hash.replace(/^#\/?/, '') || 'overview').split('?');
  const id = PAGES[path] ? path : 'overview';
  renderNav(id);
  const item = NAV.find((n) => n.id === id);
  $('#crumbs').innerHTML = `CodePulse / <b>${esc(item.label)}</b>`;
  document.title = `${item.label} · CodePulse`;
  closeDrawer(); closeModal();
  $('#sidebar').classList.remove('on'); $('#scrim').classList.remove('on');
  const view = $('#view');
  view.innerHTML = '';
  window.scrollTo(0, 0);
  PAGES[id](view, new URLSearchParams(qs || ''));
}

document.addEventListener('click', (e) => {
  const sqlBtn = e.target.closest('[data-sql]');
  if (sqlBtn) { showSQL(JSON.parse(sqlBtn.dataset.sql)); return; }
  if (e.target.closest('[data-close]')) { closeDrawer(); closeModal(); }
  if (e.target.id === 'modal') closeModal();
});
$('#scrim').addEventListener('click', () => { closeDrawer(); $('#sidebar').classList.remove('on'); $('#scrim').classList.remove('on'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });
$('#menu-btn').addEventListener('click', () => { $('#sidebar').classList.add('on'); $('#scrim').classList.add('on'); });

// theme
const savedTheme = (() => { try { return localStorage.getItem('cp-theme'); } catch { return null; } })();
const theme = savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;
$('#theme-btn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('cp-theme', next); } catch { /* private mode */ }
});

// connection badge
api('/api/health').then((h) => {
  $('#conn').classList.add('ok');
  $('#conn-text').textContent = `Live · ${h.database} · ${h.tables} tables`;
}).catch((e) => {
  $('#conn').classList.add('bad');
  $('#conn-text').textContent = 'Database not reachable';
  toast(`<b>Database not reachable.</b><br><span class="small">${esc(e.hint || e.message)}</span>`, 'bad');
});

window.addEventListener('hashchange', route);
route();
