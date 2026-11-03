// server/routes/problems.js
// Full CRUD on the main table: problems (SRS 1, 2, 7).
// Every value from the user goes through $1, $2 ... placeholders. UPDATE and DELETE always have a WHERE clause.
const express = require('express');
const { run, withTransaction } = require('../db');
const { DIFFS } = require('../queries/srs');

const router = express.Router();

// ---------- helpers
const toInt = (v) => (v === undefined || v === null || v === '' ? null : Number.parseInt(v, 10));
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const nullIfEmpty = (v) => { v = clean(v); return v === '' || v === undefined ? null : v; };

function validate(body) {
  const errors = [];
  const data = {
    title: clean(body.title),
    full_description: clean(body.full_description),
    difficulty_level: body.difficulty_level,
    setter_id: toInt(body.setter_id),
    rule_id: toInt(body.rule_id),
    constraint_text: nullIfEmpty(body.constraint_text),
    sample_input: nullIfEmpty(body.sample_input),
    sample_output: nullIfEmpty(body.sample_output),
    time_limit_ms: toInt(body.time_limit_ms),
    memory_limit_mb: toInt(body.memory_limit_mb),
    topic_ids: Array.isArray(body.topic_ids) ? body.topic_ids.map(toInt).filter(Number.isInteger) : [],
    company_ids: Array.isArray(body.company_ids) ? body.company_ids.map(toInt).filter(Number.isInteger) : []
  };
  if (!data.title || data.title.length > 150) errors.push('Title is required (max 150 characters).');
  if (!data.full_description) errors.push('Description is required.');
  if (!DIFFS.includes(data.difficulty_level)) errors.push('Difficulty must be Easy, Medium or Hard.');
  if (!Number.isInteger(data.setter_id)) errors.push('Choose a problem setter.');
  if (!Number.isInteger(data.time_limit_ms) || data.time_limit_ms < 100 || data.time_limit_ms > 10000)
    errors.push('Time limit must be between 100 and 10000 ms.');
  if (!Number.isInteger(data.memory_limit_mb) || data.memory_limit_mb < 16 || data.memory_limit_mb > 1024)
    errors.push('Memory limit must be between 16 and 1024 MB.');
  return { data, errors };
}

async function saveTags(client, problemId, topicIds, companyIds) {
  await client.query('DELETE FROM problem_topics WHERE problem_id = $1', [problemId]);
  await client.query('DELETE FROM problem_companies WHERE problem_id = $1', [problemId]);
  if (topicIds.length)
    await client.query(
      'INSERT INTO problem_topics (problem_id, topic_id) SELECT $1, UNNEST($2::int[])', [problemId, topicIds]);
  if (companyIds.length)
    await client.query(
      'INSERT INTO problem_companies (problem_id, company_id) SELECT $1, UNNEST($2::int[])', [problemId, companyIds]);
}

// Dropdown data for the form
router.get('/meta', async (req, res, next) => {
  try {
    const [setters, rules, topics, companies] = await Promise.all([
      run(`SELECT ps.user_id, u.username FROM problem_setters ps JOIN users u ON u.user_id = ps.user_id ORDER BY u.username`),
      run(`SELECT rule_id, feature_name, minimum_access_level::text AS level FROM feature_gating_rules ORDER BY feature_name`),
      run(`SELECT topic_id, topic_name FROM topics ORDER BY topic_name`),
      run(`SELECT company_id, company_name FROM companies ORDER BY company_name`)
    ]);
    res.json({ setters: setters.rows, rules: rules.rows, topics: topics.rows, companies: companies.rows });
  } catch (err) { next(err); }
});

// READ (list) - search, filters, sorting and paging
const SORTS = {
  id: 'p.problem_id ASC',
  newest: 'p.problem_id DESC',
  title: 'p.title ASC',
  acceptance: 'p.global_acceptance_rate DESC NULLS LAST, p.problem_id',
  hardest: 'p.global_acceptance_rate ASC NULLS LAST, p.problem_id',
  attempts: 'p.total_attempts DESC, p.problem_id'
};
router.get('/', async (req, res, next) => {
  try {
    const q = nullIfEmpty(req.query.q);
    const difficulty = DIFFS.includes(req.query.difficulty) ? req.query.difficulty : null;
    const topicId = toInt(req.query.topic_id);
    const companyId = toInt(req.query.company_id);
    const orderBy = SORTS[req.query.sort] || SORTS.id;          // chosen from a fixed list, never raw input
    const size = Math.min(Math.max(toInt(req.query.size) || 15, 5), 100);
    const page = Math.max(toInt(req.query.page) || 1, 1);

    const sql = `
      SELECT p.problem_id, p.title, p.difficulty_level::text AS difficulty, p.global_acceptance_rate,
             p.total_attempts, p.time_limit_ms, p.memory_limit_mb, p.creation_date,
             r.minimum_access_level::text AS access,
             (SELECT STRING_AGG(t.topic_name, ', ' ORDER BY t.topic_name)
                FROM problem_topics pt JOIN topics t ON t.topic_id = pt.topic_id
               WHERE pt.problem_id = p.problem_id) AS topics,
             COUNT(*) OVER ()::int AS total_count
      FROM problems p
      LEFT JOIN feature_gating_rules r ON r.rule_id = p.rule_id
      WHERE ($1::text IS NULL OR p.title ILIKE '%' || $1 || '%' OR p.problem_id::text = $1)
        AND ($2::text IS NULL OR p.difficulty_level = $2::difficulty_t)
        AND ($3::int IS NULL OR EXISTS (SELECT 1 FROM problem_topics x WHERE x.problem_id = p.problem_id AND x.topic_id = $3))
        AND ($4::int IS NULL OR EXISTS (SELECT 1 FROM problem_companies x WHERE x.problem_id = p.problem_id AND x.company_id = $4))
      ORDER BY ${orderBy}
      LIMIT $5 OFFSET $6`;
    const result = await run(sql, [q, difficulty, topicId, companyId, size, (page - 1) * size]);
    const total = result.rows[0] ? result.rows[0].total_count : 0;
    res.json({ rows: result.rows.map(({ total_count, ...r }) => r), total, page, size, rowCount: result.rowCount });
  } catch (err) { next(err); }
});

// READ (one) - with topics, companies, test cases, editorial and live judging numbers
router.get('/:id', async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Problem id must be a number.' });
    const [prob, topics, companies, tests, stats, editorial, langs] = await Promise.all([
      run(`SELECT p.*, p.difficulty_level::text AS difficulty_level, u.username AS setter,
                  r.feature_name, r.minimum_access_level::text AS access
           FROM problems p JOIN users u ON u.user_id = p.setter_id
           LEFT JOIN feature_gating_rules r ON r.rule_id = p.rule_id
           WHERE p.problem_id = $1`, [id]),
      run(`SELECT t.topic_id, t.topic_name FROM problem_topics pt JOIN topics t ON t.topic_id = pt.topic_id
           WHERE pt.problem_id = $1 ORDER BY t.topic_name`, [id]),
      run(`SELECT c.company_id, c.company_name FROM problem_companies pc JOIN companies c ON c.company_id = pc.company_id
           WHERE pc.problem_id = $1 ORDER BY c.company_name`, [id]),
      run(`SELECT test_case_no, file_url, sample_flag, weight FROM test_cases WHERE problem_id = $1 ORDER BY test_case_no`, [id]),
      run(`SELECT verdict::text AS verdict, COUNT(*)::int AS total FROM submissions WHERE problem_id = $1
           GROUP BY verdict ORDER BY verdict`, [id]),
      run(`SELECT editorial_id, time_complexity, space_complexity, review_status::text AS status, view_count,
                  helpfulness_rating FROM editorials WHERE problem_id = $1`, [id]),
      run(`SELECT programming_language AS language, COUNT(*)::int AS submissions,
                  MIN(runtime_ms) FILTER (WHERE verdict = 'AC') AS best_runtime_ms
           FROM submissions WHERE problem_id = $1 GROUP BY programming_language ORDER BY submissions DESC`, [id])
    ]);
    if (!prob.rowCount) return res.status(404).json({ error: `Problem ${id} was not found.` });
    res.json({
      problem: prob.rows[0], topics: topics.rows, companies: companies.rows, tests: tests.rows,
      verdicts: stats.rows, editorials: editorial.rows, languages: langs.rows
    });
  } catch (err) { next(err); }
});

// CREATE
router.post('/', async (req, res, next) => {
  const { data, errors } = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  try {
    const row = await withTransaction(async (client) => {
      // problem_id has no sequence in the schema, so take the next free number inside the transaction.
      await client.query('LOCK TABLE problems IN SHARE ROW EXCLUSIVE MODE');
      const ins = await client.query(
        `INSERT INTO problems (problem_id, setter_id, rule_id, title, full_description, difficulty_level,
                               constraint_text, sample_input, sample_output, creation_date,
                               time_limit_ms, memory_limit_mb, total_attempts, global_acceptance_rate)
         SELECT COALESCE(MAX(problem_id), 0) + 1, $1, $2, $3, $4, $5::difficulty_t, $6, $7, $8, CURRENT_DATE, $9, $10, 0, NULL
         FROM problems
         RETURNING problem_id, title, difficulty_level::text AS difficulty_level`,
        [data.setter_id, data.rule_id, data.title, data.full_description, data.difficulty_level,
         data.constraint_text, data.sample_input, data.sample_output, data.time_limit_ms, data.memory_limit_mb]);
      await saveTags(client, ins.rows[0].problem_id, data.topic_ids, data.company_ids);
      return { ...ins.rows[0], rowCount: ins.rowCount };
    });
    console.log(`INSERT problems -> problem_id ${row.problem_id}, rowCount ${row.rowCount}`);
    res.status(201).json({ message: `Problem ${row.problem_id} created successfully.`, ...row });
  } catch (err) { next(err); }
});

// UPDATE
router.put('/:id', async (req, res, next) => {
  const id = toInt(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Problem id must be a number.' });
  const { data, errors } = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  try {
    const result = await withTransaction(async (client) => {
      const upd = await client.query(
        `UPDATE problems
            SET setter_id = $1, rule_id = $2, title = $3, full_description = $4, difficulty_level = $5::difficulty_t,
                constraint_text = $6, sample_input = $7, sample_output = $8, time_limit_ms = $9, memory_limit_mb = $10
          WHERE problem_id = $11`,
        [data.setter_id, data.rule_id, data.title, data.full_description, data.difficulty_level,
         data.constraint_text, data.sample_input, data.sample_output, data.time_limit_ms, data.memory_limit_mb, id]);
      if (upd.rowCount) await saveTags(client, id, data.topic_ids, data.company_ids);
      return upd;
    });
    if (!result.rowCount) return res.status(404).json({ error: `Problem ${id} was not found.` });
    console.log(`UPDATE problems WHERE problem_id = ${id} -> rowCount ${result.rowCount}`);
    res.json({ message: `Problem ${id} updated successfully.`, rowCount: result.rowCount });
  } catch (err) { next(err); }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  const id = toInt(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Problem id must be a number.' });
  try {
    const result = await run('DELETE FROM problems WHERE problem_id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: `Problem ${id} was not found.` });
    console.log(`DELETE FROM problems WHERE problem_id = ${id} -> rowCount ${result.rowCount}`);
    res.json({ message: `Problem ${id} deleted. Its topic tags, company tags and test cases were removed with it (ON DELETE CASCADE).`, rowCount: result.rowCount });
  } catch (err) {
    if (err.code === '23503') {
      // A foreign key protects this problem. Count what still points at it, so the user sees why.
      const { rows } = await run(
        `SELECT (SELECT COUNT(*) FROM submissions WHERE problem_id = $1)::int       AS submissions,
                (SELECT COUNT(*) FROM contest_problems WHERE problem_id = $1)::int  AS contests,
                (SELECT COUNT(*) FROM editorials WHERE problem_id = $1)::int        AS editorials,
                (SELECT COUNT(*) FROM posts WHERE problem_id = $1)::int             AS posts,
                (SELECT COUNT(*) FROM plan_day_problems WHERE problem_id = $1)::int AS study_plan_days`, [id]);
      const parts = Object.entries(rows[0]).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k.replace(/_/g, ' ')}`);
      return res.status(409).json({
        error: `Problem ${id} cannot be deleted because other records still refer to it (${parts.join(', ')}). ` +
               'PostgreSQL blocked the DELETE to protect that history.',
        code: err.code, blockers: rows[0]
      });
    }
    next(err);
  }
});

module.exports = router;
