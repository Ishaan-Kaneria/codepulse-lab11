// server/queries/lab10a.js - the 30 queries from Lab 10A, runnable from the Query Lab screen.
// They are fixed, read-only SELECT statements; the browser only sends the query number.
module.exports = [
  {
    "id": 1,
    "kind": "Simple",
    "title": "Hard problems with a low acceptance rate",
    "english": "A solver wants a challenge. List every Hard problem whose acceptance rate is below 40 percent, the toughest first.",
    "srs": "SRS 1",
    "pre": null,
    "sql": "SELECT problem_id, title, difficulty_level, global_acceptance_rate, total_attempts\nFROM problems\nWHERE difficulty_level = 'Hard'\n  AND global_acceptance_rate < 40\nORDER BY global_acceptance_rate ASC;"
  },
  {
    "id": 2,
    "kind": "Simple",
    "title": "Top 10 solvers by contest rating",
    "english": "Show the ten solvers with the highest contest rating, along with their streak and the number of problems they have solved.",
    "srs": "SRS 4, 5",
    "pre": null,
    "sql": "SELECT user_id, contest_rating, current_daily_streak, total_problems_solved\nFROM solvers\nORDER BY contest_rating DESC\nLIMIT 10;"
  },
  {
    "id": 3,
    "kind": "Simple",
    "title": "Verdict distribution of all submissions",
    "english": "How are the 1,515 submissions spread over the verdicts (AC, WA, TLE, MLE, RE, CE)? Show the count and the percentage of each.",
    "srs": "SRS 3",
    "pre": null,
    "sql": "SELECT verdict,\n       COUNT(*) AS total_submissions,\n       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage\nFROM submissions\nGROUP BY verdict\nORDER BY total_submissions DESC;"
  },
  {
    "id": 4,
    "kind": "Simple",
    "title": "Features that need a Premium subscription",
    "english": "Which features are locked behind Premium? (Company-wise question lists are left out to keep the list short.)",
    "srs": "SRS 6",
    "pre": null,
    "sql": "SELECT rule_id, feature_name, minimum_access_level\nFROM feature_gating_rules\nWHERE minimum_access_level = 'Premium_Only'\n  AND feature_name NOT LIKE 'Premium Company Questions%'\nORDER BY feature_name;"
  },
  {
    "id": 5,
    "kind": "Simple",
    "title": "Premium subscriptions ending in the next 30 days",
    "english": "Which Premium subscriptions are still running but will end within 30 days of 17 Oct 2026, so that a renewal reminder can be sent?",
    "srs": "SRS 6",
    "pre": null,
    "sql": "SELECT subscription_id, user_id, subscription_tier, end_date, renewal_date, auto_renewal_flag, payment_status\nFROM subscriptions\nWHERE subscription_tier = 'Premium'\n  AND payment_status IN ('Active', 'Renewed')\n  AND end_date BETWEEN DATE '2026-10-17' AND DATE '2026-10-17' + 30\nORDER BY end_date;"
  },
  {
    "id": 6,
    "kind": "Simple",
    "title": "Problems with the most hidden test cases",
    "english": "For each problem, how many hidden test files are stored, how many of them are sample tests, and what is their total weight? Show the ten problems with the most test cases.",
    "srs": "SRS 2",
    "pre": null,
    "sql": "SELECT p.problem_id, p.title,\n       COUNT(*) AS test_cases,\n       COUNT(*) FILTER (WHERE tc.sample_flag) AS sample_tests,\n       SUM(tc.weight) AS total_weight\nFROM test_cases tc\nJOIN problems p ON p.problem_id = tc.problem_id\nGROUP BY p.problem_id, p.title\nORDER BY test_cases DESC, p.problem_id\nLIMIT 10;"
  },
  {
    "id": 7,
    "kind": "Moderate",
    "title": "Dynamic Programming problems, easiest first",
    "english": "The most common filter on the problem list: show all problems tagged Dynamic Programming, ordered from Easy to Hard and then by acceptance rate.",
    "srs": "SRS 1",
    "pre": null,
    "sql": "SELECT p.problem_id, p.title, p.difficulty_level, p.global_acceptance_rate\nFROM problems p\nJOIN problem_topics pt ON pt.problem_id = p.problem_id\nJOIN topics t ON t.topic_id = pt.topic_id\nWHERE t.topic_name = 'Dynamic Programming'\nORDER BY CASE p.difficulty_level WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,\n         p.global_acceptance_rate DESC;"
  },
  {
    "id": 8,
    "kind": "Moderate",
    "title": "Companies by latest 90-day question frequency",
    "english": "Which companies are asking questions most often right now? Take each company's newest 90-day snapshot and show it along with how many problems are tagged to that company.",
    "srs": "SRS 7",
    "pre": null,
    "sql": "SELECT c.company_name, c.industry, fs.snapshot_date, fs.frequency_count AS asked_in_90_days,\n       COUNT(pc.problem_id) AS tagged_problems\nFROM companies c\nJOIN frequency_snapshots fs\n  ON fs.company_id = c.company_id AND fs.window_days = 90\n AND fs.snapshot_date = (SELECT MAX(f2.snapshot_date) FROM frequency_snapshots f2\n                         WHERE f2.company_id = c.company_id AND f2.window_days = 90)\nLEFT JOIN problem_companies pc ON pc.company_id = c.company_id\nGROUP BY c.company_name, c.industry, fs.snapshot_date, fs.frequency_count\nORDER BY asked_in_90_days DESC\nLIMIT 10;"
  },
  {
    "id": 9,
    "kind": "Moderate",
    "title": "Past submissions of one user on one problem",
    "english": "The submissions page: show a user's latest submissions (up to 10) for a single problem, with language, verdict, runtime and memory. Here, user 7 on problem 74.",
    "srs": "SRS 3",
    "pre": null,
    "sql": "SELECT s.submission_id, p.title, s.programming_language, s.verdict,\n       s.runtime_ms, s.memory_usage_mb, s.submission_timestamp\nFROM submissions s\nJOIN problems p ON p.problem_id = s.problem_id\nWHERE s.user_id = 7\n  AND s.problem_id = 74\nORDER BY s.submission_timestamp DESC\nLIMIT 10;"
  },
  {
    "id": 10,
    "kind": "Moderate",
    "title": "User profile card",
    "english": "Build the profile page header of a user (user 82): name, country, rating, streak, problems solved, reputation points, number of badges earned and number of followers.",
    "srs": "SRS 5, 8, 10",
    "pre": null,
    "sql": "SELECT u.username, u.country, s.contest_rating, s.current_daily_streak,\n       s.total_problems_solved, u.contribution_point,\n       (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.user_id) AS badges_earned,\n       (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.user_id)  AS followers\nFROM users u\nJOIN solvers s ON s.user_id = u.user_id\nWHERE u.user_id = 82;"
  },
  {
    "id": 11,
    "kind": "Moderate",
    "title": "Contest leaderboard (top 10)",
    "english": "Show the leaderboard of contest 87: rank, username, problems solved, score and time penalty. Disqualified users must not appear.",
    "srs": "SRS 4",
    "pre": null,
    "sql": "SELECT pt.current_rank, u.username, u.country, pt.problems_solved, pt.total_score, pt.time_penalty\nFROM participations pt\nJOIN users u ON u.user_id = pt.user_id\nWHERE pt.contest_id = 87\n  AND pt.disqualification_flag = FALSE\nORDER BY pt.current_rank\nLIMIT 10;"
  },
  {
    "id": 12,
    "kind": "Moderate",
    "title": "Monthly revenue from successful payments",
    "english": "How much money did Premium bring in each month? Add up only the payments that succeeded and keep INR and USD apart.",
    "srs": "SRS 6",
    "pre": null,
    "sql": "SELECT DATE_TRUNC('month', py.payment_date)::date AS month,\n       py.currency,\n       COUNT(*) AS payments,\n       SUM(py.amount) AS revenue\nFROM payments py\nJOIN subscriptions sb ON sb.subscription_id = py.subscription_id\nWHERE py.transaction_status = 'Success'\n  AND sb.subscription_tier = 'Premium'\nGROUP BY DATE_TRUNC('month', py.payment_date), py.currency\nORDER BY month DESC, py.currency\nLIMIT 12;"
  },
  {
    "id": 13,
    "kind": "Complex",
    "title": "Easy / Medium / Hard solved count per user",
    "english": "The solved-problems ring on a profile: for the users who solved the most distinct problems, split their Accepted solutions into Easy, Medium and Hard. Count each problem only once.",
    "srs": "SRS 5",
    "pre": null,
    "sql": "SELECT u.username,\n       COUNT(DISTINCT p.problem_id) FILTER (WHERE p.difficulty_level = 'Easy')   AS easy,\n       COUNT(DISTINCT p.problem_id) FILTER (WHERE p.difficulty_level = 'Medium') AS medium,\n       COUNT(DISTINCT p.problem_id) FILTER (WHERE p.difficulty_level = 'Hard')   AS hard,\n       COUNT(DISTINCT p.problem_id) AS total_solved\nFROM submissions s\nJOIN problems p ON p.problem_id = s.problem_id\nJOIN users u    ON u.user_id = s.user_id\nWHERE s.verdict = 'AC'\nGROUP BY u.user_id, u.username\nORDER BY total_solved DESC, u.username\nLIMIT 10;"
  },
  {
    "id": 14,
    "kind": "Complex",
    "title": "Problems attempted often but never solved",
    "english": "Which problems have been attempted at least 3 times but nobody has ever got an Accepted verdict? Useful for finding unfair or broken problems.",
    "srs": "SRS 1, 3",
    "pre": null,
    "sql": "SELECT p.problem_id, p.title, p.difficulty_level, COUNT(*) AS attempts,\n       COUNT(DISTINCT s.user_id) AS different_users\nFROM problems p\nJOIN submissions s ON s.problem_id = p.problem_id\nWHERE NOT EXISTS (SELECT 1 FROM submissions a\n                  WHERE a.problem_id = p.problem_id AND a.verdict = 'AC')\nGROUP BY p.problem_id, p.title, p.difficulty_level\nHAVING COUNT(*) >= 3\nORDER BY attempts DESC, p.problem_id;"
  },
  {
    "id": 15,
    "kind": "Complex",
    "title": "Runtime beats X% of accepted solutions",
    "english": "The 'your runtime beats 80% of submissions' bar: for problem 74, list every Accepted solution from fastest to slowest and show the percentage of other accepted solutions it beats.",
    "srs": "SRS 3",
    "pre": null,
    "sql": "SELECT s.submission_id, u.username, s.programming_language,\n       s.runtime_ms, s.memory_usage_mb,\n       ROUND(100 * (1 - PERCENT_RANK() OVER (ORDER BY s.runtime_ms))::numeric, 1) AS runtime_beats_pct\nFROM submissions s\nJOIN users u ON u.user_id = s.user_id\nWHERE s.problem_id = 74\n  AND s.verdict = 'AC'\nORDER BY s.runtime_ms;"
  },
  {
    "id": 16,
    "kind": "Complex",
    "title": "Top 3 solvers of every country (window function)",
    "english": "Country leaderboard: rank the solvers inside each country by contest rating and show the top 3 of every country (ties share a rank).",
    "srs": "SRS 4, 5",
    "pre": null,
    "sql": "SELECT country, username, contest_rating, country_rank\nFROM (\n    SELECT u.country, u.username, s.contest_rating,\n           RANK() OVER (PARTITION BY u.country ORDER BY s.contest_rating DESC) AS country_rank\n    FROM users u\n    JOIN solvers s ON s.user_id = u.user_id\n) ranked\nWHERE country_rank <= 3\nORDER BY country, country_rank, username\nLIMIT 15;"
  },
  {
    "id": 17,
    "kind": "Complex",
    "title": "Rating change after every contest (LAG)",
    "english": "The rating graph of a user: for the user who has played the most rated contests, show the rating after each contest and how much it went up or down compared with the previous contest.",
    "srs": "SRS 4",
    "pre": null,
    "sql": "SELECT u.username, c.title AS contest, c.start_time::date AS contest_date,\n       rh.platform_rank, rh.new_rating,\n       rh.new_rating - LAG(rh.new_rating) OVER (PARTITION BY rh.user_id ORDER BY c.start_time) AS rating_change\nFROM rating_history rh\nJOIN users u    ON u.user_id = rh.user_id\nJOIN contests c ON c.contest_id = rh.contest_id\nWHERE rh.user_id = (SELECT user_id FROM rating_history\n                    GROUP BY user_id ORDER BY COUNT(*) DESC, user_id LIMIT 1)\nORDER BY c.start_time;"
  },
  {
    "id": 18,
    "kind": "Complex",
    "title": "Longest run of consecutive solving days",
    "english": "Streaks: find the longest unbroken run of days on which a user had at least one Accepted submission (gaps-and-islands method). Show the best 10 runs.",
    "srs": "SRS 5",
    "pre": null,
    "sql": "WITH solve_days AS (\n    SELECT DISTINCT user_id, submission_timestamp::date AS day\n    FROM submissions\n    WHERE verdict = 'AC'\n), islands AS (\n    SELECT user_id, day,\n           day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int AS island_key\n    FROM solve_days\n), streaks AS (\n    SELECT user_id, MIN(day) AS first_day, MAX(day) AS last_day, COUNT(*) AS streak_days\n    FROM islands\n    GROUP BY user_id, island_key\n)\nSELECT u.username, st.first_day, st.last_day, st.streak_days\nFROM streaks st\nJOIN users u ON u.user_id = st.user_id\nORDER BY st.streak_days DESC, st.first_day, u.username\nLIMIT 10;"
  },
  {
    "id": 19,
    "kind": "Complex",
    "title": "Identical code submitted by different users in one contest",
    "english": "Cheating check: find code that has the same SHA-256 hash and was submitted by two or more different users on the same problem in the same contest.",
    "srs": "SRS 11",
    "pre": null,
    "sql": "SELECT c.title AS contest, s.problem_id,\n       LEFT(s.code_hash, 12) AS hash_prefix,\n       LENGTH(cb.source_code) AS code_length,\n       COUNT(DISTINCT s.user_id) AS users_sharing,\n       STRING_AGG(DISTINCT u.username, ', ') AS usernames\nFROM submissions s\nJOIN code_blobs cb ON cb.code_hash = s.code_hash\nJOIN contests c    ON c.contest_id = s.contest_id\nJOIN users u       ON u.user_id = s.user_id\nWHERE s.contest_id IS NOT NULL\nGROUP BY c.title, s.contest_id, s.problem_id, s.code_hash, cb.source_code\nHAVING COUNT(DISTINCT s.user_id) > 1\nORDER BY s.contest_id, s.problem_id;"
  },
  {
    "id": 20,
    "kind": "Complex",
    "title": "Compile errors by language and compiler version",
    "english": "Which language and compiler version produce the most compiler errors? Join the central failure log with its Compiler-error subclass through the composite key (log_id, log_type).",
    "srs": "SRS 3, 12",
    "pre": null,
    "sql": "SELECT s.programming_language, cel.compiler_version, COUNT(*) AS compile_errors\nFROM compiler_error_logs cel\nJOIN failure_logs fl ON fl.log_id = cel.log_id AND fl.log_type = cel.log_type\nJOIN submissions s   ON s.submission_id = fl.submission_id\nGROUP BY s.programming_language, cel.compiler_version\nORDER BY compile_errors DESC, s.programming_language, cel.compiler_version\nLIMIT 10;"
  },
  {
    "id": 21,
    "kind": "Function",
    "title": "User acceptance percentage (stored function)",
    "english": "Create a small reusable function that returns the percentage of a user's submissions that were Accepted, then use it to list the users with the most submissions along with their acceptance percentage.",
    "srs": "SRS 3, 5",
    "pre": "CREATE OR REPLACE FUNCTION fn_user_acceptance_pct(p_user_id INT)\nRETURNS NUMERIC AS $$\n    SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE verdict = 'AC') / NULLIF(COUNT(*), 0), 2)\n    FROM submissions\n    WHERE user_id = p_user_id;\n$$ LANGUAGE sql STABLE;",
    "sql": "SELECT u.user_id, u.username, COUNT(*) AS submissions,\n       fn_user_acceptance_pct(u.user_id) AS acceptance_pct\nFROM users u\nJOIN submissions s ON s.user_id = u.user_id\nGROUP BY u.user_id, u.username\nORDER BY submissions DESC, u.user_id\nLIMIT 8;"
  },
  {
    "id": 22,
    "kind": "Complex",
    "title": "Reported posts waiting for a moderator",
    "english": "The moderation queue: list every report that has no review yet, with the reporter, the post, its author and the reason, oldest report first.",
    "srs": "SRS 9",
    "pre": null,
    "sql": "SELECT fr.report_id, fr.reason, fr.report_timestamp,\n       ru.username AS reporter, p.title AS post_title,\n       pa.username AS post_author, p.post_status\nFROM flag_reports fr\nLEFT JOIN moderator_reviews mr ON mr.report_id = fr.report_id\nJOIN users ru ON ru.user_id = fr.reporter_id\nJOIN posts p  ON p.post_id = fr.post_id\nJOIN users pa ON pa.user_id = p.user_id\nWHERE mr.review_id IS NULL\nORDER BY fr.report_timestamp;"
  },
  {
    "id": 23,
    "kind": "Complex",
    "title": "Moderator workload and speed",
    "english": "How busy is each moderation lead? Show the number of reviews, the average hours taken to close a report, and how many posts were removed. Only moderators with at least 2 reviews.",
    "srs": "SRS 9",
    "pre": null,
    "sql": "SELECT u.username AS moderator,\n       COUNT(*) AS reviews,\n       ROUND(AVG(EXTRACT(EPOCH FROM (mr.review_timestamp - fr.report_timestamp)) / 3600)::numeric, 1) AS avg_hours_to_close,\n       COUNT(*) FILTER (WHERE mr.final_decision = 'Removed') AS posts_removed\nFROM moderator_reviews mr\nJOIN flag_reports fr ON fr.report_id = mr.report_id\nJOIN users u         ON u.user_id = mr.moderator_id\nGROUP BY u.user_id, u.username\nHAVING COUNT(*) >= 2\nORDER BY reviews DESC, u.username\nLIMIT 10;"
  },
  {
    "id": 24,
    "kind": "Complex",
    "title": "Study plan progress of active learners",
    "english": "Show how far each active learner has got in their study plan: current day, total days in the plan, and the percentage finished.",
    "srs": "SRS 10",
    "pre": null,
    "sql": "SELECT u.username, sp.plan_name, e.current_day, pd.total_days,\n       ROUND(100.0 * e.current_day / pd.total_days, 1) AS percent_done,\n       e.completion_status\nFROM enrolments e\nJOIN users u        ON u.user_id = e.user_id\nJOIN study_plans sp ON sp.plan_id = e.plan_id\nJOIN (SELECT plan_id, COUNT(*) AS total_days FROM plan_days GROUP BY plan_id) pd\n     ON pd.plan_id = e.plan_id\nWHERE e.completion_status = 'Active'\nORDER BY percent_done DESC, u.username\nLIMIT 10;"
  },
  {
    "id": 25,
    "kind": "Complex",
    "title": "Most discussed solution posts",
    "english": "Discussion tab: for each solution post, count its upvotes, bookmarks and comments, and show the 10 most talked-about posts.",
    "srs": "SRS 8",
    "pre": null,
    "sql": "SELECT p.post_id, p.title, u.username AS author,\n       COALESCE(r.upvotes, 0)   AS upvotes,\n       COALESCE(r.bookmarks, 0) AS bookmarks,\n       COALESCE(c.comments, 0)  AS comments\nFROM posts p\nJOIN users u ON u.user_id = p.user_id\nLEFT JOIN (SELECT post_id,\n                  COUNT(*) FILTER (WHERE action_type = 'Upvote')   AS upvotes,\n                  COUNT(*) FILTER (WHERE action_type = 'Bookmark') AS bookmarks\n           FROM reactions GROUP BY post_id) r ON r.post_id = p.post_id\nLEFT JOIN (SELECT post_id, COUNT(*) AS comments\n           FROM comments GROUP BY post_id) c ON c.post_id = p.post_id\nORDER BY COALESCE(r.upvotes, 0) + COALESCE(c.comments, 0) DESC, p.post_id\nLIMIT 10;"
  },
  {
    "id": 26,
    "kind": "Complex",
    "title": "Practice suggestions from weak topics",
    "english": "Recommend what to practise next: take the 3 weakest topics of user 52 (only topics that have problems) and list problems of those topics that the user has not solved yet.",
    "srs": "SRS 5",
    "pre": null,
    "sql": "WITH weak AS (\n    SELECT tm.topic_id, tm.topic_accuracy\n    FROM topic_mastery tm\n    WHERE tm.user_id = 52\n      AND EXISTS (SELECT 1 FROM problem_topics pt WHERE pt.topic_id = tm.topic_id)\n    ORDER BY tm.topic_accuracy ASC\n    LIMIT 3\n)\nSELECT t.topic_name, w.topic_accuracy, p.problem_id, p.title, p.difficulty_level\nFROM weak w\nJOIN topics t          ON t.topic_id = w.topic_id\nJOIN problem_topics pt ON pt.topic_id = w.topic_id\nJOIN problems p        ON p.problem_id = pt.problem_id\nWHERE NOT EXISTS (SELECT 1 FROM submissions s\n                  WHERE s.user_id = 52 AND s.problem_id = p.problem_id AND s.verdict = 'AC')\nORDER BY w.topic_accuracy, p.global_acceptance_rate DESC\nLIMIT 10;"
  },
  {
    "id": 27,
    "kind": "Complex",
    "title": "People you may want to follow",
    "english": "Social suggestions for user 340: find users who are followed by the people user 340 already follows, but whom user 340 does not follow yet.",
    "srs": "SRS 8",
    "pre": null,
    "sql": "SELECT u.user_id, u.username, u.country, COUNT(*) AS followed_by_my_followees\nFROM follows mine\nJOIN follows fof ON fof.follower_id = mine.followee_id\nJOIN users u     ON u.user_id = fof.followee_id\nWHERE mine.follower_id = 340\n  AND fof.followee_id <> 340\n  AND NOT EXISTS (SELECT 1 FROM follows x\n                  WHERE x.follower_id = 340 AND x.followee_id = fof.followee_id)\nGROUP BY u.user_id, u.username, u.country\nORDER BY followed_by_my_followees DESC, u.username\nLIMIT 10;"
  },
  {
    "id": 28,
    "kind": "Complex",
    "title": "Solvers eligible for a streak badge but without one",
    "english": "Since badge awarding is done by the backend, it needs a list: solvers whose current streak is at least 7 days and who do not own any Streak badge yet.",
    "srs": "SRS 10",
    "pre": null,
    "sql": "SELECT s.user_id, u.username, s.current_daily_streak,\n       (SELECT b.badge_name FROM badges b\n        WHERE b.category = 'Streak'\n          AND b.badge_name ~ '^[0-9]+'\n          AND split_part(b.badge_name, '-', 1)::int <= s.current_daily_streak\n        ORDER BY split_part(b.badge_name, '-', 1)::int DESC LIMIT 1) AS highest_badge_due\nFROM solvers s\nJOIN users u ON u.user_id = s.user_id\nWHERE s.current_daily_streak >= 7\n  AND NOT EXISTS (SELECT 1\n                  FROM user_badges ub\n                  JOIN badges b ON b.badge_id = ub.badge_id\n                  WHERE ub.user_id = s.user_id AND b.category = 'Streak')\nORDER BY s.current_daily_streak DESC, s.user_id\nLIMIT 10;"
  },
  {
    "id": 29,
    "kind": "Complex",
    "title": "Replies to the comments of one post",
    "english": "This query fetches all replies (sub-comments) made on a specific post (post 100). It links each reply to its text and author so that the front-end can show it under the right parent comment.",
    "srs": "SRS 8",
    "pre": null,
    "sql": "SELECT\n    reply_text.comment_id        AS reply_id,\n    reply_text.comment_body      AS reply_body,\n    reply_text.comment_timestamp AS reply_time,\n    reply_text.user_id           AS author_id,\n    sub.parent_comment_id        AS parent_id\nFROM comment_replies sub\nJOIN comments reply_text ON sub.comment_id = reply_text.comment_id\nJOIN comments parent_comment ON sub.parent_comment_id = parent_comment.comment_id\nWHERE parent_comment.post_id = 100;"
  },
  {
    "id": 30,
    "kind": "Complex",
    "title": "Total nested replies under every comment (recursive)",
    "english": "This recursive query counts all nested replies (children and grandchildren) under every comment in the database.",
    "srs": "SRS 8",
    "pre": null,
    "sql": "WITH RECURSIVE comment_tree AS (\n    SELECT parent_comment_id AS root_comment_id,\n           comment_id        AS child_comment_id\n    FROM comment_replies\n\n    UNION ALL\n\n    SELECT t.root_comment_id,\n           r.comment_id AS child_comment_id\n    FROM comment_tree t\n    JOIN comment_replies r ON t.child_comment_id = r.parent_comment_id\n)\nSELECT c.comment_id, c.comment_body,\n       COUNT(t.child_comment_id) AS total_deep_replies\nFROM comments c\nLEFT JOIN comment_tree t ON c.comment_id = t.root_comment_id\nGROUP BY c.comment_id, c.comment_body\nORDER BY total_deep_replies DESC;"
  }
];
