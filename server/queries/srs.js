// server/queries/srs.js
// Read-only queries behind every screen of the GUI, grouped by the SRS V6 product function they serve.
// The SQL is fixed here on the server. The browser only picks a query by key and sends typed values,
// which always travel as $1, $2 ... placeholders (never pasted into the SQL text).

const AS_OF = '2026-10-17'; // "today" inside the sample data set

const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'];
const LANGS = ['C', 'C++', 'Java', 'Python'];
const DIFFS = ['Easy', 'Medium', 'Hard'];

const TABLES = [
  'users', 'solvers', 'problem_setters', 'contest_managers', 'moderation_leads', 'platform_administrators',
  'subscriptions', 'payments', 'feature_gating_rules', 'problems', 'topics', 'problem_topics', 'test_cases',
  'companies', 'problem_companies', 'frequency_snapshots', 'editorials', 'editorial_code_snippets', 'contests',
  'contest_problems', 'participations', 'code_blobs', 'submissions', 'failure_logs', 'compiler_error_logs',
  'runtime_failure_logs', 'judge_output_logs', 'badges', 'user_badges', 'study_plans', 'plan_days',
  'plan_day_problems', 'enrolments', 'rating_history', 'posts', 'comments', 'comment_replies', 'reactions',
  'follows', 'flag_reports', 'moderator_reviews', 'topic_mastery'
];

// p(name, type, options) describes one input value.
const p = (name, type, opts = {}) => ({ name, type, ...opts });

const Q = {
  // ---------------------------------------------------------------- Overview
  'overview.stats': {
    srs: 'Overview',
    sql: `SELECT
      (SELECT COUNT(*) FROM users)::int        AS users,
      (SELECT COUNT(*) FROM solvers)::int      AS solvers,
      (SELECT COUNT(*) FROM problems)::int     AS problems,
      (SELECT COUNT(*) FROM submissions)::int  AS submissions,
      (SELECT COUNT(*) FROM contests)::int     AS contests,
      (SELECT COUNT(*) FROM posts)::int        AS posts,
      (SELECT COUNT(*) FROM topics)::int       AS topics,
      (SELECT COUNT(*) FROM companies)::int    AS companies,
      (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE verdict = 'AC') / NULLIF(COUNT(*), 0), 1)
         FROM submissions) AS acceptance_pct,
      (SELECT COUNT(*) FROM subscriptions
        WHERE subscription_tier = 'Premium' AND payment_status IN ('Active', 'Renewed')
          AND end_date >= DATE '${AS_OF}')::int AS active_premium`
  },
  'overview.verdicts': {
    srs: 'SRS 3',
    sql: `SELECT verdict::text AS verdict, COUNT(*)::int AS total
          FROM submissions GROUP BY verdict ORDER BY verdict`
  },
  'overview.difficulty': {
    srs: 'SRS 1',
    sql: `SELECT difficulty_level::text AS difficulty, COUNT(*)::int AS problems,
                 ROUND(AVG(global_acceptance_rate), 1) AS avg_acceptance
          FROM problems GROUP BY difficulty_level ORDER BY difficulty_level`
  },
  'overview.languages': {
    srs: 'SRS 3',
    sql: `SELECT programming_language AS language, COUNT(*)::int AS submissions,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE verdict = 'AC') / COUNT(*), 1) AS ac_pct,
                 ROUND(AVG(runtime_ms) FILTER (WHERE verdict = 'AC'))::int AS avg_ac_runtime_ms
          FROM submissions GROUP BY programming_language ORDER BY submissions DESC`
  },
  'overview.recent': {
    srs: 'SRS 3',
    sql: `SELECT s.submission_id, u.username, p.title, s.programming_language AS language,
                 s.verdict::text AS verdict, s.runtime_ms, s.submission_timestamp
          FROM submissions s
          JOIN users u ON u.user_id = s.user_id
          JOIN problems p ON p.problem_id = s.problem_id
          ORDER BY s.submission_timestamp DESC LIMIT 8`
  },
  'overview.pulse': {
    srs: 'SRS 3',
    sql: `SELECT s.submission_id AS id, s.verdict::text AS v,
                 s.submission_timestamp::date::text AS d
          FROM submissions s
          ORDER BY s.submission_timestamp, s.submission_id`
  },
  'overview.tables': {
    srs: 'Schema',
    sql: TABLES.map((t) => `SELECT '${t}' AS table_name, COUNT(*)::int AS row_count FROM ${t}`).join('\nUNION ALL\n') +
      '\nORDER BY row_count DESC'
  },
  'overview.topics': {
    srs: 'SRS 1',
    sql: `SELECT t.topic_name, COUNT(*)::int AS problems
          FROM problem_topics pt JOIN topics t ON t.topic_id = pt.topic_id
          GROUP BY t.topic_name ORDER BY problems DESC, t.topic_name LIMIT 10`
  },

  // ---------------------------------------------------------------- SRS 2 + 3 + 12: judging
  'submissions.list': {
    srs: 'SRS 3',
    params: [
      p('verdict', 'enum', { values: VERDICTS }),
      p('language', 'enum', { values: LANGS }),
      p('username', 'text'),
      p('problem_id', 'int'),
      p('contest_only', 'bool')
    ],
    sql: `SELECT s.submission_id, u.username, s.problem_id, p.title, p.difficulty_level::text AS difficulty,
                 s.programming_language AS language, s.verdict::text AS verdict, s.runtime_ms,
                 s.memory_usage_mb, s.partial_score, s.contest_id, s.submission_timestamp
          FROM submissions s
          JOIN users u    ON u.user_id = s.user_id
          JOIN problems p ON p.problem_id = s.problem_id
          WHERE ($1::text IS NULL OR s.verdict = $1::verdict_t)
            AND ($2::text IS NULL OR s.programming_language = $2)
            AND ($3::text IS NULL OR u.username ILIKE '%' || $3 || '%')
            AND ($4::int  IS NULL OR s.problem_id = $4)
            AND ($5::bool IS NULL OR $5 = FALSE OR s.contest_id IS NOT NULL)
          ORDER BY s.submission_timestamp DESC
          LIMIT 60`
  },
  'submissions.detail': {
    srs: 'SRS 3, 11, 12',
    params: [p('submission_id', 'int', { required: true })],
    sql: `SELECT s.submission_id, u.username, s.user_id, p.problem_id, p.title, p.time_limit_ms, p.memory_limit_mb,
                 s.programming_language AS language, s.verdict::text AS verdict, s.runtime_ms, s.memory_usage_mb,
                 s.partial_score, s.submission_timestamp, s.contest_id, c.title AS contest_title,
                 s.code_hash, cb.source_code,
                 (SELECT COUNT(*) FROM submissions d WHERE d.code_hash = s.code_hash)::int AS same_hash_count,
                 fl.log_id, fl.log_type::text AS log_type, fl.exit_code, fl.log_timestamp,
                 ce.compiler_version, ce.full_error_text, ce.warning_text,
                 rf.termination_signal, rf.stack_trace, rf.standard_error_snippet, rf.peak_memory_usage_mb, rf.peak_cpu_usage_pct,
                 jo.test_case_no, jo.expected_output, jo.actual_output, jo.checker_message
          FROM submissions s
          JOIN users u    ON u.user_id = s.user_id
          JOIN problems p ON p.problem_id = s.problem_id
          LEFT JOIN contests c   ON c.contest_id = s.contest_id
          LEFT JOIN code_blobs cb ON cb.code_hash = s.code_hash
          LEFT JOIN failure_logs fl ON fl.submission_id = s.submission_id
          LEFT JOIN compiler_error_logs ce  ON ce.log_id = fl.log_id AND ce.log_type = fl.log_type
          LEFT JOIN runtime_failure_logs rf ON rf.log_id = fl.log_id AND rf.log_type = fl.log_type
          LEFT JOIN judge_output_logs jo    ON jo.log_id = fl.log_id AND jo.log_type = fl.log_type
          WHERE s.submission_id = $1`
  },
  'submissions.matrix': {
    srs: 'SRS 3',
    sql: `SELECT p.difficulty_level::text AS difficulty,
                 COUNT(*) FILTER (WHERE s.verdict = 'AC')::int  AS "AC",
                 COUNT(*) FILTER (WHERE s.verdict = 'WA')::int  AS "WA",
                 COUNT(*) FILTER (WHERE s.verdict = 'TLE')::int AS "TLE",
                 COUNT(*) FILTER (WHERE s.verdict = 'MLE')::int AS "MLE",
                 COUNT(*) FILTER (WHERE s.verdict = 'RE')::int  AS "RE",
                 COUNT(*) FILTER (WHERE s.verdict = 'CE')::int  AS "CE",
                 COUNT(*)::int AS total
          FROM submissions s JOIN problems p ON p.problem_id = s.problem_id
          GROUP BY p.difficulty_level ORDER BY p.difficulty_level`
  },
  'integrity.logs': {
    srs: 'SRS 12',
    sql: `SELECT fl.log_type::text AS log_type,
                 COUNT(*)::int AS failure_logs,
                 COUNT(ce.log_id)::int AS compiler_rows,
                 COUNT(rf.log_id)::int AS runtime_rows,
                 COUNT(jo.log_id)::int AS judge_rows,
                 COUNT(*) FILTER (WHERE (ce.log_id IS NOT NULL)::int + (rf.log_id IS NOT NULL)::int
                                      + (jo.log_id IS NOT NULL)::int <> 1)::int AS broken_rows
          FROM failure_logs fl
          LEFT JOIN compiler_error_logs ce  ON ce.log_id = fl.log_id AND ce.log_type = fl.log_type
          LEFT JOIN runtime_failure_logs rf ON rf.log_id = fl.log_id AND rf.log_type = fl.log_type
          LEFT JOIN judge_output_logs jo    ON jo.log_id = fl.log_id AND jo.log_type = fl.log_type
          GROUP BY fl.log_type ORDER BY fl.log_type`
  },
  'integrity.verdict_logs': {
    srs: 'SRS 3, 12',
    sql: `SELECT s.verdict::text AS verdict, COUNT(*)::int AS submissions,
                 COUNT(fl.log_id)::int AS with_failure_log,
                 STRING_AGG(DISTINCT fl.log_type::text, ', ') AS log_types
          FROM submissions s LEFT JOIN failure_logs fl ON fl.submission_id = s.submission_id
          GROUP BY s.verdict ORDER BY s.verdict`
  },
  'integrity.dedup': {
    srs: 'SRS 11',
    sql: `SELECT (SELECT COUNT(*) FROM submissions)::int AS submissions,
                 (SELECT COUNT(*) FROM code_blobs)::int  AS unique_code_blobs,
                 (SELECT COUNT(*) FROM (SELECT code_hash FROM submissions GROUP BY code_hash
                                         HAVING COUNT(DISTINCT user_id) > 1) x)::int AS hashes_shared_by_users,
                 (SELECT ROUND(SUM(LENGTH(cb.source_code)) / 1024.0, 1) FROM code_blobs cb) AS stored_kb,
                 (SELECT ROUND(SUM(LENGTH(cb.source_code)) / 1024.0, 1)
                    FROM submissions s JOIN code_blobs cb ON cb.code_hash = s.code_hash) AS kb_without_dedup`
  },
  'integrity.plagiarism': {
    srs: 'SRS 11',
    sql: `SELECT c.contest_id, c.title AS contest, s.problem_id, p.title AS problem,
                 LEFT(s.code_hash, 16) AS hash_prefix,
                 COUNT(DISTINCT s.user_id)::int AS users_sharing,
                 STRING_AGG(DISTINCT u.username, ', ') AS usernames,
                 MIN(s.submission_timestamp) AS first_seen, MAX(s.submission_timestamp) AS last_seen
          FROM submissions s
          JOIN contests c ON c.contest_id = s.contest_id
          JOIN problems p ON p.problem_id = s.problem_id
          JOIN users u    ON u.user_id = s.user_id
          WHERE s.contest_id IS NOT NULL
          GROUP BY c.contest_id, c.title, s.problem_id, p.title, s.code_hash
          HAVING COUNT(DISTINCT s.user_id) > 1
          ORDER BY c.contest_id, s.problem_id`
  },
  'integrity.compilers': {
    srs: 'SRS 3, 12',
    sql: `SELECT s.programming_language AS language, ce.compiler_version, COUNT(*)::int AS compile_errors
          FROM compiler_error_logs ce
          JOIN failure_logs fl ON fl.log_id = ce.log_id AND fl.log_type = ce.log_type
          JOIN submissions s   ON s.submission_id = fl.submission_id
          GROUP BY s.programming_language, ce.compiler_version
          ORDER BY compile_errors DESC`
  },

  // ---------------------------------------------------------------- SRS 4: contests
  'contests.list': {
    srs: 'SRS 4',
    sql: `SELECT c.contest_id, c.title, c.contest_type::text AS contest_type, c.start_time, c.end_time,
                 c.ratings_published_at, u.username AS manager,
                 (SELECT COUNT(*) FROM participations pt WHERE pt.contest_id = c.contest_id)::int AS participants,
                 (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id = c.contest_id)::int AS problems
          FROM contests c JOIN users u ON u.user_id = c.manager_id
          ORDER BY c.start_time DESC`
  },
  'contests.leaderboard': {
    srs: 'SRS 4',
    params: [p('contest_id', 'int', { required: true })],
    sql: `SELECT pt.current_rank, u.user_id, u.username, u.country, pt.problems_solved, pt.total_score,
                 pt.time_penalty, pt.disqualification_flag,
                 rh.new_rating, rh.percentile_score
          FROM participations pt
          JOIN users u ON u.user_id = pt.user_id
          LEFT JOIN rating_history rh ON rh.user_id = pt.user_id AND rh.contest_id = pt.contest_id
          WHERE pt.contest_id = $1
          ORDER BY pt.disqualification_flag, pt.current_rank`
  },
  'contests.problems': {
    srs: 'SRS 4',
    params: [p('contest_id', 'int', { required: true })],
    sql: `SELECT cp.display_order, p.problem_id, p.title, p.difficulty_level::text AS difficulty, cp.point_value,
                 (SELECT COUNT(*) FROM submissions s WHERE s.contest_id = cp.contest_id AND s.problem_id = cp.problem_id)::int AS attempts,
                 (SELECT COUNT(DISTINCT s.user_id) FROM submissions s WHERE s.contest_id = cp.contest_id
                     AND s.problem_id = cp.problem_id AND s.verdict = 'AC')::int AS solved_by
          FROM contest_problems cp JOIN problems p ON p.problem_id = cp.problem_id
          WHERE cp.contest_id = $1 ORDER BY cp.display_order`
  },
  'contests.top_rated': {
    srs: 'SRS 4, 5',
    sql: `SELECT u.user_id, u.username, u.country, s.contest_rating,
                 (SELECT COUNT(*) FROM participations pt WHERE pt.user_id = u.user_id)::int AS contests_played,
                 RANK() OVER (ORDER BY s.contest_rating DESC)::int AS global_rank
          FROM solvers s JOIN users u ON u.user_id = s.user_id
          ORDER BY s.contest_rating DESC LIMIT 15`
  },

  // ---------------------------------------------------------------- SRS 5: progress
  'users.search': {
    srs: 'SRS 5',
    params: [p('q', 'text')],
    sql: `SELECT u.user_id, u.username, u.country, s.contest_rating, s.total_problems_solved
          FROM users u LEFT JOIN solvers s ON s.user_id = u.user_id
          WHERE $1::text IS NULL OR u.username ILIKE '%' || $1 || '%' OR u.user_id::text = $1
          ORDER BY s.contest_rating DESC NULLS LAST, u.user_id LIMIT 25`
  },
  'users.profile': {
    srs: 'SRS 5, 8',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT u.user_id, u.username, u.email_address, u.country, u.registration_date, u.last_login_timestamp,
                 u.session_count, u.contribution_point, u.engagement_score,
                 s.contest_rating, s.current_daily_streak, s.total_problems_solved,
                 (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.user_id)::int AS followers,
                 (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.user_id)::int AS following,
                 (SELECT COUNT(*) FROM submissions x WHERE x.user_id = u.user_id)::int AS submissions,
                 (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE verdict = 'AC') / NULLIF(COUNT(*), 0), 1)
                    FROM submissions x WHERE x.user_id = u.user_id) AS acceptance_pct,
                 (SELECT COUNT(*) FROM posts x WHERE x.user_id = u.user_id)::int AS posts,
                 ARRAY_REMOVE(ARRAY[
                   CASE WHEN s.user_id IS NOT NULL THEN 'Solver' END,
                   CASE WHEN EXISTS (SELECT 1 FROM problem_setters r WHERE r.user_id = u.user_id) THEN 'Problem Setter' END,
                   CASE WHEN EXISTS (SELECT 1 FROM contest_managers r WHERE r.user_id = u.user_id) THEN 'Contest Manager' END,
                   CASE WHEN EXISTS (SELECT 1 FROM moderation_leads r WHERE r.user_id = u.user_id) THEN 'Moderation Lead' END,
                   CASE WHEN EXISTS (SELECT 1 FROM platform_administrators r WHERE r.user_id = u.user_id) THEN 'Platform Admin' END
                 ], NULL) AS roles,
                 (SELECT sb.subscription_tier::text || ' - ' || sb.payment_status::text FROM subscriptions sb
                   WHERE sb.user_id = u.user_id ORDER BY sb.end_date DESC LIMIT 1) AS subscription
          FROM users u LEFT JOIN solvers s ON s.user_id = u.user_id
          WHERE u.user_id = $1`
  },
  'users.solved_split': {
    srs: 'SRS 5',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT d.difficulty::text AS difficulty,
                 COUNT(DISTINCT s.problem_id)::int AS solved,
                 (SELECT COUNT(*) FROM problems x WHERE x.difficulty_level = d.difficulty)::int AS total
          FROM unnest(enum_range(NULL::difficulty_t)) AS d(difficulty)
          LEFT JOIN problems p ON p.difficulty_level = d.difficulty
          LEFT JOIN submissions s ON s.problem_id = p.problem_id AND s.user_id = $1 AND s.verdict = 'AC'
          GROUP BY d.difficulty ORDER BY d.difficulty`
  },
  'users.mastery': {
    srs: 'SRS 5',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT t.topic_name, tm.topic_accuracy
          FROM topic_mastery tm JOIN topics t ON t.topic_id = tm.topic_id
          WHERE tm.user_id = $1 ORDER BY tm.topic_accuracy DESC`
  },
  'users.badges': {
    srs: 'SRS 10',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT b.badge_name, b.category::text AS category, b.badge_description, ub.award_date
          FROM user_badges ub JOIN badges b ON b.badge_id = ub.badge_id
          WHERE ub.user_id = $1 ORDER BY ub.award_date DESC`
  },
  'users.rating': {
    srs: 'SRS 4',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT c.title AS contest, c.start_time::date AS contest_date, rh.platform_rank, rh.percentile_score,
                 rh.new_rating,
                 rh.new_rating - LAG(rh.new_rating) OVER (ORDER BY c.start_time) AS change
          FROM rating_history rh JOIN contests c ON c.contest_id = rh.contest_id
          WHERE rh.user_id = $1 ORDER BY c.start_time`
  },
  'users.recent': {
    srs: 'SRS 3',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT s.submission_id, p.title, s.programming_language AS language, s.verdict::text AS verdict,
                 s.runtime_ms, s.memory_usage_mb, s.submission_timestamp
          FROM submissions s JOIN problems p ON p.problem_id = s.problem_id
          WHERE s.user_id = $1 ORDER BY s.submission_timestamp DESC LIMIT 10`
  },
  'users.suggest': {
    srs: 'SRS 5',
    params: [p('user_id', 'int', { required: true })],
    sql: `WITH weak AS (
            SELECT tm.topic_id, tm.topic_accuracy FROM topic_mastery tm
            WHERE tm.user_id = $1
              AND EXISTS (SELECT 1 FROM problem_topics pt WHERE pt.topic_id = tm.topic_id)
            ORDER BY tm.topic_accuracy LIMIT 3)
          SELECT t.topic_name, w.topic_accuracy, p.problem_id, p.title, p.difficulty_level::text AS difficulty,
                 p.global_acceptance_rate
          FROM weak w
          JOIN topics t ON t.topic_id = w.topic_id
          JOIN problem_topics pt ON pt.topic_id = w.topic_id
          JOIN problems p ON p.problem_id = pt.problem_id
          WHERE NOT EXISTS (SELECT 1 FROM submissions s
                            WHERE s.user_id = $1 AND s.problem_id = p.problem_id AND s.verdict = 'AC')
          ORDER BY w.topic_accuracy, p.global_acceptance_rate DESC LIMIT 8`
  },
  'users.streak_leaders': {
    srs: 'SRS 5',
    sql: `SELECT u.user_id, u.username, s.current_daily_streak, s.total_problems_solved, s.contest_rating
          FROM solvers s JOIN users u ON u.user_id = s.user_id
          ORDER BY s.current_daily_streak DESC, s.total_problems_solved DESC LIMIT 10`
  },

  // ---------------------------------------------------------------- SRS 6: premium
  'premium.summary': {
    srs: 'SRS 6',
    sql: `SELECT subscription_tier::text AS tier, payment_status::text AS status, COUNT(*)::int AS subscriptions
          FROM subscriptions GROUP BY subscription_tier, payment_status ORDER BY tier, status`
  },
  'premium.expiring': {
    srs: 'SRS 6',
    params: [p('days', 'int', { default: 30 })],
    sql: `SELECT sb.subscription_id, u.username, sb.subscription_tier::text AS tier, sb.end_date, sb.renewal_date,
                 sb.auto_renewal_flag, sb.payment_status::text AS status,
                 (sb.end_date - DATE '${AS_OF}')::int AS days_left
          FROM subscriptions sb JOIN users u ON u.user_id = sb.user_id
          WHERE sb.subscription_tier = 'Premium' AND sb.payment_status IN ('Active', 'Renewed')
            AND sb.end_date BETWEEN DATE '${AS_OF}' AND DATE '${AS_OF}' + $1::int
          ORDER BY sb.end_date`
  },
  'premium.revenue': {
    srs: 'SRS 6',
    sql: `SELECT TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') AS month,
                 COALESCE(SUM(amount) FILTER (WHERE currency = 'INR'), 0) AS inr,
                 COALESCE(SUM(amount) FILTER (WHERE currency = 'USD'), 0) AS usd,
                 COUNT(*)::int AS payments
          FROM payments WHERE transaction_status = 'Success'
          GROUP BY DATE_TRUNC('month', payment_date)
          ORDER BY month DESC LIMIT 12`
  },
  'premium.payments': {
    srs: 'SRS 6',
    sql: `SELECT py.payment_id, u.username, py.amount, py.currency, py.payment_method,
                 py.transaction_status::text AS status, py.payment_date
          FROM payments py JOIN subscriptions sb ON sb.subscription_id = py.subscription_id
          JOIN users u ON u.user_id = sb.user_id
          ORDER BY py.payment_date DESC LIMIT 15`
  },
  'premium.rules': {
    srs: 'SRS 6',
    sql: `SELECT r.rule_id, r.feature_name, r.minimum_access_level::text AS level,
                 (SELECT COUNT(*) FROM problems p WHERE p.rule_id = r.rule_id)::int AS problems,
                 (SELECT COUNT(*) FROM editorials e WHERE e.rule_id = r.rule_id)::int AS editorials
          FROM feature_gating_rules r ORDER BY r.minimum_access_level DESC, r.feature_name`
  },
  'premium.access_check': {
    srs: 'SRS 6',
    params: [p('user_id', 'int', { required: true }), p('rule_id', 'int', { required: true })],
    sql: `WITH sub AS (
            SELECT subscription_tier, payment_status, end_date FROM subscriptions
            WHERE user_id = $1 ORDER BY end_date DESC LIMIT 1)
          SELECT u.username, r.feature_name, r.minimum_access_level::text AS needs,
                 COALESCE(sub.subscription_tier::text, 'None') AS tier,
                 sub.payment_status::text AS status, sub.end_date,
                 CASE
                   WHEN r.minimum_access_level IN ('Free', 'Registered') THEN TRUE
                   WHEN sub.subscription_tier = 'Premium' AND sub.payment_status IN ('Active', 'Renewed')
                        AND sub.end_date >= DATE '${AS_OF}' THEN TRUE
                   ELSE FALSE
                 END AS allowed
          FROM users u CROSS JOIN feature_gating_rules r LEFT JOIN sub ON TRUE
          WHERE u.user_id = $1 AND r.rule_id = $2`
  },

  // ---------------------------------------------------------------- SRS 7: companies & editorials
  'companies.list': {
    srs: 'SRS 7',
    sql: `SELECT c.company_id, c.company_name, c.industry, c.dynamic_trending_score,
                 (SELECT fs.frequency_count FROM frequency_snapshots fs WHERE fs.company_id = c.company_id
                    AND fs.window_days = 90 ORDER BY fs.snapshot_date DESC LIMIT 1) AS freq_90d,
                 (SELECT COUNT(*) FROM problem_companies pc WHERE pc.company_id = c.company_id)::int AS problems
          FROM companies c
          ORDER BY freq_90d DESC NULLS LAST, c.company_name`
  },
  'companies.snapshots': {
    srs: 'SRS 7',
    params: [p('company_id', 'int', { required: true })],
    sql: `SELECT snapshot_date, window_days, frequency_count
          FROM frequency_snapshots WHERE company_id = $1
          ORDER BY snapshot_date, window_days`
  },
  'companies.problems': {
    srs: 'SRS 7',
    params: [p('company_id', 'int', { required: true })],
    sql: `SELECT p.problem_id, p.title, p.difficulty_level::text AS difficulty, p.global_acceptance_rate,
                 r.minimum_access_level::text AS access
          FROM problem_companies pc JOIN problems p ON p.problem_id = pc.problem_id
          LEFT JOIN feature_gating_rules r ON r.rule_id = p.rule_id
          WHERE pc.company_id = $1 ORDER BY p.difficulty_level, p.title`
  },
  'editorials.list': {
    srs: 'SRS 7',
    sql: `SELECT e.editorial_id, p.problem_id, p.title, e.time_complexity, e.space_complexity,
                 e.review_status::text AS status, e.view_count, e.helpfulness_rating, e.publication_date,
                 u.username AS setter,
                 (SELECT STRING_AGG(sn.programming_language, ', ' ORDER BY sn.snippet_no)
                    FROM editorial_code_snippets sn WHERE sn.editorial_id = e.editorial_id) AS languages
          FROM editorials e JOIN problems p ON p.problem_id = e.problem_id
          JOIN users u ON u.user_id = e.setter_id
          ORDER BY e.view_count DESC LIMIT 40`
  },
  'editorials.detail': {
    srs: 'SRS 7',
    params: [p('editorial_id', 'int', { required: true })],
    sql: `SELECT e.editorial_id, p.title, e.solution_text, e.time_complexity, e.space_complexity,
                 sn.snippet_no, sn.programming_language, sn.code_snippet
          FROM editorials e JOIN problems p ON p.problem_id = e.problem_id
          LEFT JOIN editorial_code_snippets sn ON sn.editorial_id = e.editorial_id
          WHERE e.editorial_id = $1 ORDER BY sn.snippet_no`
  },

  // ---------------------------------------------------------------- SRS 8: community
  'community.posts': {
    srs: 'SRS 8',
    params: [p('sort', 'enum', { values: ['top', 'new', 'discussed'] }), p('q', 'text')],
    sql: `SELECT p.post_id, p.title, u.username AS author, pr.title AS problem, p.programming_language_tag AS language,
                 p.post_status::text AS status, p.creation_timestamp,
                 COALESCE(r.up, 0)::int AS upvotes, COALESCE(r.down, 0)::int AS downvotes,
                 COALESCE(r.saved, 0)::int AS bookmarks, COALESCE(c.n, 0)::int AS comments
          FROM posts p
          JOIN users u ON u.user_id = p.user_id
          LEFT JOIN problems pr ON pr.problem_id = p.problem_id
          LEFT JOIN (SELECT post_id,
                            COUNT(*) FILTER (WHERE action_type = 'Upvote')   AS up,
                            COUNT(*) FILTER (WHERE action_type = 'Downvote') AS down,
                            COUNT(*) FILTER (WHERE action_type = 'Bookmark') AS saved
                     FROM reactions GROUP BY post_id) r ON r.post_id = p.post_id
          LEFT JOIN (SELECT post_id, COUNT(*) AS n FROM comments GROUP BY post_id) c ON c.post_id = p.post_id
          WHERE ($2::text IS NULL OR p.title ILIKE '%' || $2 || '%' OR pr.title ILIKE '%' || $2 || '%')
          ORDER BY CASE WHEN $1::text = 'new' THEN EXTRACT(EPOCH FROM p.creation_timestamp) END DESC NULLS LAST,
                   CASE WHEN $1::text = 'discussed' THEN COALESCE(c.n, 0) END DESC NULLS LAST,
                   COALESCE(r.up, 0) - COALESCE(r.down, 0) DESC, p.post_id
          LIMIT 40`
  },
  'community.post': {
    srs: 'SRS 8',
    params: [p('post_id', 'int', { required: true })],
    sql: `SELECT p.post_id, p.title, p.body_text, p.code_snippet, p.programming_language_tag AS language,
                 p.time_complexity_analysis, p.edge_case_explanation, p.post_status::text AS status,
                 p.creation_timestamp, u.username AS author, pr.title AS problem
          FROM posts p JOIN users u ON u.user_id = p.user_id
          LEFT JOIN problems pr ON pr.problem_id = p.problem_id
          WHERE p.post_id = $1`
  },
  'community.comments': {
    srs: 'SRS 8',
    params: [p('post_id', 'int', { required: true })],
    sql: `SELECT c.comment_id, cr.parent_comment_id, u.username, c.comment_body, c.comment_timestamp
          FROM comments c JOIN users u ON u.user_id = c.user_id
          LEFT JOIN comment_replies cr ON cr.comment_id = c.comment_id
          WHERE c.post_id = $1 ORDER BY c.comment_timestamp`
  },
  'community.contributors': {
    srs: 'SRS 8',
    sql: `SELECT u.user_id, u.username, u.country, u.contribution_point,
                 (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.user_id)::int AS posts,
                 (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.user_id)::int AS followers
          FROM users u ORDER BY u.contribution_point DESC LIMIT 10`
  },
  'community.suggest_follow': {
    srs: 'SRS 8',
    params: [p('user_id', 'int', { required: true })],
    sql: `SELECT u.user_id, u.username, u.country, COUNT(*)::int AS followed_by_my_followees
          FROM follows mine
          JOIN follows fof ON fof.follower_id = mine.followee_id
          JOIN users u     ON u.user_id = fof.followee_id
          WHERE mine.follower_id = $1 AND fof.followee_id <> $1
            AND NOT EXISTS (SELECT 1 FROM follows x WHERE x.follower_id = $1 AND x.followee_id = fof.followee_id)
          GROUP BY u.user_id, u.username, u.country
          ORDER BY followed_by_my_followees DESC, u.username LIMIT 8`
  },

  // ---------------------------------------------------------------- SRS 9: moderation
  'moderation.queue': {
    srs: 'SRS 9',
    sql: `SELECT fr.report_id, fr.reason::text AS reason, fr.report_timestamp, fr.extra_note,
                 ru.username AS reporter, p.post_id, p.title AS post_title, pa.username AS post_author,
                 p.post_status::text AS post_status,
                 (DATE '${AS_OF}' + TIME '23:59' - fr.report_timestamp) AS waiting
          FROM flag_reports fr
          LEFT JOIN moderator_reviews mr ON mr.report_id = fr.report_id
          JOIN users ru ON ru.user_id = fr.reporter_id
          JOIN posts p  ON p.post_id = fr.post_id
          JOIN users pa ON pa.user_id = p.user_id
          WHERE mr.review_id IS NULL
          ORDER BY fr.report_timestamp`
  },
  'moderation.history': {
    srs: 'SRS 9',
    sql: `SELECT mr.review_id, fr.report_id, fr.reason::text AS reason, p.title AS post_title,
                 mu.username AS moderator, mr.action_taken, mr.final_decision::text AS decision,
                 fr.report_timestamp, mr.review_timestamp,
                 ROUND(EXTRACT(EPOCH FROM (mr.review_timestamp - fr.report_timestamp)) / 3600, 1) AS hours_to_close
          FROM moderator_reviews mr
          JOIN flag_reports fr ON fr.report_id = mr.report_id
          JOIN posts p ON p.post_id = fr.post_id
          JOIN users mu ON mu.user_id = mr.moderator_id
          ORDER BY mr.review_timestamp DESC LIMIT 40`
  },
  'moderation.reasons': {
    srs: 'SRS 9',
    sql: `SELECT fr.reason::text AS reason, COUNT(DISTINCT fr.report_id)::int AS reports,
                 COUNT(mr.review_id) FILTER (WHERE mr.final_decision = 'Removed')::int AS removed,
                 COUNT(mr.review_id) FILTER (WHERE mr.final_decision = 'Approved')::int AS kept
          FROM flag_reports fr LEFT JOIN moderator_reviews mr ON mr.report_id = fr.report_id
          GROUP BY fr.reason ORDER BY reports DESC`
  },
  'moderation.workload': {
    srs: 'SRS 9',
    sql: `SELECT u.username AS moderator, COUNT(*)::int AS reviews,
                 ROUND(AVG(EXTRACT(EPOCH FROM (mr.review_timestamp - fr.report_timestamp)) / 3600)::numeric, 1) AS avg_hours,
                 COUNT(*) FILTER (WHERE mr.final_decision = 'Removed')::int AS removed
          FROM moderator_reviews mr
          JOIN flag_reports fr ON fr.report_id = mr.report_id
          JOIN users u ON u.user_id = mr.moderator_id
          GROUP BY u.user_id, u.username ORDER BY reviews DESC, u.username LIMIT 12`
  },

  // ---------------------------------------------------------------- SRS 10: study plans & badges
  'plans.list': {
    srs: 'SRS 10',
    sql: `SELECT sp.plan_id, sp.plan_name, sp.description, sp.difficulty_level::text AS difficulty,
                 (SELECT COUNT(*) FROM plan_days d WHERE d.plan_id = sp.plan_id)::int AS days,
                 (SELECT COUNT(*) FROM plan_day_problems x WHERE x.plan_id = sp.plan_id)::int AS problems,
                 (SELECT COUNT(*) FROM enrolments e WHERE e.plan_id = sp.plan_id)::int AS enrolled,
                 (SELECT COUNT(*) FROM enrolments e WHERE e.plan_id = sp.plan_id AND e.completion_status = 'Completed')::int AS completed
          FROM study_plans sp ORDER BY enrolled DESC, sp.plan_id`
  },
  'plans.days': {
    srs: 'SRS 10',
    params: [p('plan_id', 'int', { required: true })],
    sql: `SELECT d.day_number, p.problem_id, p.title, p.difficulty_level::text AS difficulty
          FROM plan_days d LEFT JOIN plan_day_problems x ON x.plan_id = d.plan_id AND x.day_number = d.day_number
          LEFT JOIN problems p ON p.problem_id = x.problem_id
          WHERE d.plan_id = $1 ORDER BY d.day_number, p.problem_id`
  },
  'plans.enrolments': {
    srs: 'SRS 10',
    params: [p('plan_id', 'int', { required: true })],
    sql: `SELECT u.username, e.enrolment_date, e.goal, e.current_day,
                 (SELECT COUNT(*) FROM plan_days d WHERE d.plan_id = e.plan_id)::int AS total_days,
                 e.completion_status::text AS status
          FROM enrolments e JOIN users u ON u.user_id = e.user_id
          WHERE e.plan_id = $1 ORDER BY e.current_day DESC, u.username`
  },
  'badges.list': {
    srs: 'SRS 10',
    sql: `SELECT b.badge_id, b.badge_name, b.category::text AS category, b.unlock_criterion,
                 COUNT(ub.user_id)::int AS awarded
          FROM badges b LEFT JOIN user_badges ub ON ub.badge_id = b.badge_id
          GROUP BY b.badge_id ORDER BY b.category, b.badge_id`
  },
  'badges.recent': {
    srs: 'SRS 10',
    sql: `SELECT u.username, b.badge_name, b.category::text AS category, ub.award_date
          FROM user_badges ub JOIN users u ON u.user_id = ub.user_id JOIN badges b ON b.badge_id = ub.badge_id
          ORDER BY ub.award_date DESC LIMIT 12`
  },
  'badges.eligible': {
    srs: 'SRS 10',
    sql: `SELECT s.user_id, u.username, s.current_daily_streak,
                 (SELECT b.badge_name FROM badges b
                   WHERE b.category = 'Streak' AND b.badge_name ~ '^[0-9]+'
                     AND split_part(b.badge_name, '-', 1)::int <= s.current_daily_streak
                   ORDER BY split_part(b.badge_name, '-', 1)::int DESC LIMIT 1) AS badge_due
          FROM solvers s JOIN users u ON u.user_id = s.user_id
          WHERE s.current_daily_streak >= 7
            AND NOT EXISTS (SELECT 1 FROM user_badges ub JOIN badges b ON b.badge_id = ub.badge_id
                            WHERE ub.user_id = s.user_id AND b.category = 'Streak')
          ORDER BY s.current_daily_streak DESC LIMIT 12`
  }
};

module.exports = { Q, AS_OF, VERDICTS, LANGS, DIFFS };
