-- LeetCode-Style Practice Management System  |  Team 25  |  MC212 Lab 9
-- PostgreSQL 16  |  Final schema (BCNF): 42 tables


CREATE TYPE difficulty_t      AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE verdict_t         AS ENUM ('AC', 'WA', 'TLE', 'MLE', 'RE', 'CE');
CREATE TYPE sub_tier_t        AS ENUM ('Free', 'Premium');
CREATE TYPE sub_status_t      AS ENUM ('Active', 'Expired', 'Cancelled',
                                       'Renewed');
CREATE TYPE txn_status_t      AS ENUM ('Success', 'Failed', 'Pending');
CREATE TYPE access_level_t    AS ENUM ('Free', 'Registered', 'Premium_Only');
CREATE TYPE contest_type_t    AS ENUM ('Weekly', 'Biweekly', 'Special');
CREATE TYPE badge_category_t  AS ENUM ('Rating', 'Streak', 'Reputation');
CREATE TYPE post_status_t     AS ENUM ('Published', 'Flagged', 'Under_Review',
                                       'Approved', 'Hidden', 'Removed',
                                       'Locked');
CREATE TYPE flag_reason_t     AS ENUM ('Spam', 'Toxicity', 'Contest_Cheating',
                                       'Plagiarism', 'Off_Topic');
CREATE TYPE decision_t        AS ENUM ('Approved', 'Hidden', 'Removed',
                                       'Locked');
CREATE TYPE reaction_t        AS ENUM ('Upvote', 'Downvote', 'Bookmark');
CREATE TYPE editorial_status_t AS ENUM ('Draft', 'Published', 'Retired');
CREATE TYPE enrol_status_t    AS ENUM ('Active', 'Completed', 'Abandoned');
CREATE TYPE log_type_t        AS ENUM ('Compiler', 'Runtime', 'Judge');

CREATE TABLE users (
    user_id               INTEGER       PRIMARY KEY,
    username              VARCHAR(30)   NOT NULL UNIQUE,
    email_address         VARCHAR(100)  NOT NULL UNIQUE,
    password_hash         CHAR(60)      NOT NULL,
    registration_date     DATE          NOT NULL,
    country               VARCHAR(50),
    last_login_timestamp  TIMESTAMP,
    session_count         INTEGER       NOT NULL DEFAULT 0
                          CHECK (session_count >= 0),
    contribution_point    INTEGER       NOT NULL DEFAULT 0,
    engagement_score      NUMERIC(5,2)
                          CHECK (engagement_score BETWEEN 0 AND 100)
);

CREATE TABLE solvers (
    user_id                INTEGER  PRIMARY KEY
                           REFERENCES users (user_id) ON DELETE CASCADE,
    contest_rating         INTEGER  NOT NULL DEFAULT 1200
                           CHECK (contest_rating BETWEEN 0 AND 4000),
    current_daily_streak   INTEGER  NOT NULL DEFAULT 0
                           CHECK (current_daily_streak >= 0),
    total_problems_solved  INTEGER  NOT NULL DEFAULT 0
                           CHECK (total_problems_solved >= 0)
);

CREATE TABLE problem_setters (
    user_id  INTEGER  PRIMARY KEY
             REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE contest_managers (
    user_id  INTEGER  PRIMARY KEY
             REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE moderation_leads (
    user_id  INTEGER  PRIMARY KEY
             REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE platform_administrators (
    user_id          INTEGER   PRIMARY KEY
                     REFERENCES users (user_id) ON DELETE CASCADE,
    clearance_level  SMALLINT  NOT NULL
                     CHECK (clearance_level BETWEEN 1 AND 5)
);

CREATE TABLE subscriptions (
    subscription_id    INTEGER         PRIMARY KEY,
    user_id            INTEGER         NOT NULL
                       REFERENCES users (user_id),
    subscription_tier  sub_tier_t      NOT NULL,
    start_date         DATE            NOT NULL,
    end_date           DATE,
    renewal_date       DATE,
    auto_renewal_flag  BOOLEAN         NOT NULL DEFAULT FALSE,
    payment_status     sub_status_t    NOT NULL,
    CHECK (end_date IS NULL OR end_date >= start_date),
    CHECK (renewal_date IS NULL OR renewal_date >= start_date)
);

CREATE TABLE payments (
    payment_id          INTEGER         PRIMARY KEY,
    subscription_id     INTEGER         NOT NULL
                        REFERENCES subscriptions (subscription_id),
    amount              NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    currency            CHAR(3)         NOT NULL
                        CHECK (currency IN ('INR', 'USD')),
    payment_date        TIMESTAMP       NOT NULL,
    payment_method      VARCHAR(30)     NOT NULL,
    transaction_status  txn_status_t    NOT NULL
);

CREATE TABLE feature_gating_rules (
    rule_id               INTEGER         PRIMARY KEY,
    feature_name          VARCHAR(90)     NOT NULL UNIQUE,
    minimum_access_level  access_level_t  NOT NULL
);

CREATE TABLE problems (
    problem_id              INTEGER        PRIMARY KEY,
    setter_id               INTEGER        NOT NULL
                            REFERENCES problem_setters (user_id),
    rule_id                 INTEGER
                            REFERENCES feature_gating_rules (rule_id),
    title                   VARCHAR(150)   NOT NULL,
    full_description        TEXT           NOT NULL,
    difficulty_level        difficulty_t   NOT NULL,
    constraint_text         TEXT,
    sample_input            TEXT,
    sample_output           TEXT,
    creation_date           DATE           NOT NULL,
    time_limit_ms           INTEGER        NOT NULL
                            CHECK (time_limit_ms BETWEEN 100 AND 10000),
    memory_limit_mb         INTEGER        NOT NULL
                            CHECK (memory_limit_mb BETWEEN 16 AND 1024),
    total_attempts          INTEGER        NOT NULL DEFAULT 0
                            CHECK (total_attempts >= 0),
    global_acceptance_rate  NUMERIC(5,2)
                            CHECK (global_acceptance_rate BETWEEN 0 AND 100)
);

CREATE TABLE topics (
    topic_id    INTEGER      PRIMARY KEY,
    topic_name  VARCHAR(60)  NOT NULL UNIQUE
);

CREATE TABLE problem_topics (
    problem_id  INTEGER  REFERENCES problems (problem_id) ON DELETE CASCADE,
    topic_id    INTEGER  REFERENCES topics (topic_id)     ON DELETE CASCADE,
    PRIMARY KEY (problem_id, topic_id)
);

CREATE TABLE test_cases (
    problem_id    INTEGER       REFERENCES problems (problem_id)
                  ON DELETE CASCADE,
    test_case_no  SMALLINT      CHECK (test_case_no > 0),
    file_url      VARCHAR(255)  NOT NULL UNIQUE,
    sample_flag   BOOLEAN       NOT NULL DEFAULT FALSE,
    weight        NUMERIC(5,2)  NOT NULL DEFAULT 1.00 CHECK (weight > 0),
    PRIMARY KEY (problem_id, test_case_no)
);

CREATE TABLE companies (
    company_id              INTEGER       PRIMARY KEY,
    company_name            VARCHAR(100)  NOT NULL UNIQUE,
    industry                VARCHAR(60),
    logo_url                VARCHAR(255),
    dynamic_trending_score  NUMERIC(5,2)
                            CHECK (dynamic_trending_score BETWEEN 0 AND 100)
);

CREATE TABLE problem_companies (
    problem_id  INTEGER  REFERENCES problems (problem_id)   ON DELETE CASCADE,
    company_id  INTEGER  REFERENCES companies (company_id)  ON DELETE CASCADE,
    PRIMARY KEY (problem_id, company_id)
);

CREATE TABLE frequency_snapshots (
    company_id       INTEGER   REFERENCES companies (company_id)
                     ON DELETE CASCADE,
    snapshot_date    DATE,
    window_days      SMALLINT  CHECK (window_days IN (30, 90, 180)),
    frequency_count  INTEGER   NOT NULL CHECK (frequency_count >= 0),
    PRIMARY KEY (company_id, snapshot_date, window_days)
);

CREATE TABLE editorials (
    editorial_id        INTEGER             PRIMARY KEY,
    problem_id          INTEGER             NOT NULL
                        REFERENCES problems (problem_id),
    setter_id           INTEGER             NOT NULL
                        REFERENCES problem_setters (user_id),
    rule_id             INTEGER
                        REFERENCES feature_gating_rules (rule_id),
    solution_text       TEXT                NOT NULL,
    time_complexity     VARCHAR(40),
    space_complexity    VARCHAR(40),
    review_status       editorial_status_t  NOT NULL,
    view_count          INTEGER             NOT NULL DEFAULT 0
                        CHECK (view_count >= 0),
    helpfulness_rating  NUMERIC(3,2)
                        CHECK (helpfulness_rating BETWEEN 0 AND 5),
    publication_date    DATE
);

CREATE TABLE editorial_code_snippets (
    editorial_id          INTEGER      REFERENCES editorials (editorial_id)
                          ON DELETE CASCADE,
    snippet_no            SMALLINT     CHECK (snippet_no > 0),
    programming_language  VARCHAR(20)  NOT NULL,
    code_snippet          TEXT         NOT NULL,
    PRIMARY KEY (editorial_id, snippet_no),
    UNIQUE (editorial_id, programming_language)
);

CREATE TABLE contests (
    contest_id            INTEGER         PRIMARY KEY,
    manager_id            INTEGER         NOT NULL
                          REFERENCES contest_managers (user_id),
    title                 VARCHAR(150)    NOT NULL,
    description           TEXT,
    start_time            TIMESTAMP       NOT NULL,
    end_time              TIMESTAMP       NOT NULL,
    contest_type          contest_type_t  NOT NULL,
    ratings_published_at  TIMESTAMP,
    CHECK (end_time > start_time),
    CHECK (ratings_published_at IS NULL OR ratings_published_at >= end_time)
);

CREATE TABLE contest_problems (
    contest_id     INTEGER   REFERENCES contests (contest_id)
                   ON DELETE CASCADE,
    problem_id     INTEGER   REFERENCES problems (problem_id),
    point_value    SMALLINT  NOT NULL CHECK (point_value > 0),
    display_order  SMALLINT  NOT NULL CHECK (display_order > 0),
    PRIMARY KEY (contest_id, problem_id),
    UNIQUE (contest_id, display_order)
);

CREATE TABLE participations (
    user_id                INTEGER   REFERENCES solvers (user_id)
                           ON DELETE CASCADE,
    contest_id             INTEGER   REFERENCES contests (contest_id)
                           ON DELETE CASCADE,
    problems_solved        SMALLINT  NOT NULL DEFAULT 0
                           CHECK (problems_solved >= 0),
    total_score            INTEGER   NOT NULL DEFAULT 0
                           CHECK (total_score >= 0),
    current_rank           INTEGER   CHECK (current_rank > 0),
    time_penalty           INTEGER   NOT NULL DEFAULT 0
                           CHECK (time_penalty >= 0),
    disqualification_flag  BOOLEAN   NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, contest_id)
);

CREATE TABLE code_blobs (
    code_hash    CHAR(64)  PRIMARY KEY
                 CHECK (code_hash ~ '^[0-9a-f]{64}$'),
    source_code  TEXT      NOT NULL UNIQUE,
    CHECK (code_hash = encode(sha256(convert_to(source_code, 'UTF8')), 'hex'))
);

CREATE TABLE submissions (
    submission_id         BIGINT        PRIMARY KEY,
    user_id               INTEGER       NOT NULL
                          REFERENCES solvers (user_id),
    problem_id            INTEGER       NOT NULL
                          REFERENCES problems (problem_id),
    contest_id            INTEGER,
    code_hash             CHAR(64)      NOT NULL
                          REFERENCES code_blobs (code_hash),
    programming_language  VARCHAR(20)   NOT NULL
                          CHECK (programming_language IN
                                 ('C', 'C++', 'Java', 'Python')),
    submission_timestamp  TIMESTAMP     NOT NULL,
    runtime_ms            INTEGER       CHECK (runtime_ms >= 0),
    memory_usage_mb       INTEGER       CHECK (memory_usage_mb >= 0),
    verdict               verdict_t,
    partial_score         NUMERIC(5,2)
                          CHECK (partial_score BETWEEN 0 AND 100),
    CONSTRAINT submissions_participation_fk
        FOREIGN KEY (user_id, contest_id)
        REFERENCES participations (user_id, contest_id),
    CONSTRAINT submissions_contest_problem_fk
        FOREIGN KEY (contest_id, problem_id)
        REFERENCES contest_problems (contest_id, problem_id)
);

CREATE TABLE failure_logs (
    log_id         BIGINT      PRIMARY KEY,
    submission_id  BIGINT      NOT NULL UNIQUE
                   REFERENCES submissions (submission_id)
                   ON DELETE CASCADE,
    log_type       log_type_t  NOT NULL,
    log_timestamp  TIMESTAMP   NOT NULL,
    exit_code      INTEGER,
    UNIQUE (log_id, log_type)
);

CREATE TABLE compiler_error_logs (
    log_id            BIGINT       PRIMARY KEY,
    log_type          log_type_t   NOT NULL DEFAULT 'Compiler'
                      CHECK (log_type = 'Compiler'),
    compiler_version  VARCHAR(40)  NOT NULL,
    full_error_text   TEXT         NOT NULL,
    warning_text      TEXT,
    FOREIGN KEY (log_id, log_type)
        REFERENCES failure_logs (log_id, log_type) ON DELETE CASCADE
);

CREATE TABLE runtime_failure_logs (
    log_id                  BIGINT        PRIMARY KEY,
    log_type                log_type_t    NOT NULL DEFAULT 'Runtime'
                            CHECK (log_type = 'Runtime'),
    termination_signal      VARCHAR(20),
    stack_trace             TEXT,
    standard_error_snippet  TEXT,
    peak_memory_usage_mb    INTEGER       CHECK (peak_memory_usage_mb >= 0),
    peak_cpu_usage_pct      NUMERIC(5,2)
                            CHECK (peak_cpu_usage_pct BETWEEN 0 AND 100),
    FOREIGN KEY (log_id, log_type)
        REFERENCES failure_logs (log_id, log_type) ON DELETE CASCADE
);

CREATE TABLE judge_output_logs (
    log_id           BIGINT        PRIMARY KEY,
    log_type         log_type_t    NOT NULL DEFAULT 'Judge'
                     CHECK (log_type = 'Judge'),
    problem_id       INTEGER       NOT NULL,
    test_case_no     SMALLINT      NOT NULL,
    expected_output  TEXT,
    actual_output    TEXT,
    checker_message  VARCHAR(255),
    FOREIGN KEY (log_id, log_type)
        REFERENCES failure_logs (log_id, log_type) ON DELETE CASCADE,
    FOREIGN KEY (problem_id, test_case_no)
        REFERENCES test_cases (problem_id, test_case_no)
);

CREATE TABLE badges (
    badge_id           INTEGER           PRIMARY KEY,
    badge_name         VARCHAR(60)       NOT NULL UNIQUE,
    badge_description  VARCHAR(255),
    category           badge_category_t  NOT NULL,
    unlock_criterion   VARCHAR(255)      NOT NULL
);

CREATE TABLE user_badges (
    user_id     INTEGER  REFERENCES users (user_id) ON DELETE CASCADE,
    badge_id    INTEGER  REFERENCES badges (badge_id),
    award_date  DATE     NOT NULL,
    PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE study_plans (
    plan_id           INTEGER       PRIMARY KEY,
    plan_name         VARCHAR(100)  NOT NULL,
    description       TEXT,
    difficulty_level  difficulty_t  NOT NULL
);

CREATE TABLE plan_days (
    plan_id     INTEGER   REFERENCES study_plans (plan_id)
                ON DELETE CASCADE,
    day_number  SMALLINT  CHECK (day_number > 0),
    PRIMARY KEY (plan_id, day_number)
);

CREATE TABLE plan_day_problems (
    plan_id     INTEGER   NOT NULL,
    day_number  SMALLINT  NOT NULL,
    problem_id  INTEGER   NOT NULL REFERENCES problems (problem_id),
    PRIMARY KEY (plan_id, day_number, problem_id),
    FOREIGN KEY (plan_id, day_number)
        REFERENCES plan_days (plan_id, day_number) ON DELETE CASCADE
);

CREATE TABLE enrolments (
    user_id            INTEGER          REFERENCES solvers (user_id)
                       ON DELETE CASCADE,
    plan_id            INTEGER          REFERENCES study_plans (plan_id),
    enrolment_date     DATE             NOT NULL,
    goal               VARCHAR(100),
    current_day        SMALLINT         NOT NULL DEFAULT 1
                       CHECK (current_day > 0),
    completion_status  enrol_status_t   NOT NULL,
    PRIMARY KEY (user_id, plan_id)
);

CREATE TABLE rating_history (
    user_id           INTEGER       NOT NULL,
    contest_id        INTEGER       NOT NULL,
    new_rating        INTEGER       NOT NULL CHECK (new_rating >= 0),
    platform_rank     INTEGER       CHECK (platform_rank > 0),
    percentile_score  NUMERIC(5,2)  CHECK (percentile_score BETWEEN 0 AND 100),
    PRIMARY KEY (user_id, contest_id),
    FOREIGN KEY (user_id, contest_id)
        REFERENCES participations (user_id, contest_id)
);

CREATE TABLE posts (
    post_id                   BIGINT         PRIMARY KEY,
    user_id                   INTEGER        NOT NULL
                              REFERENCES users (user_id),
    problem_id                INTEGER        NOT NULL
                              REFERENCES problems (problem_id),
    title                     VARCHAR(150)   NOT NULL,
    body_text                 TEXT           NOT NULL,
    code_snippet              TEXT,
    programming_language_tag  VARCHAR(20),
    time_complexity_analysis  VARCHAR(40),
    edge_case_explanation     TEXT,
    creation_timestamp        TIMESTAMP      NOT NULL,
    post_status               post_status_t  NOT NULL DEFAULT 'Published'
);

CREATE TABLE comments (
    comment_id         BIGINT     PRIMARY KEY,
    user_id            INTEGER    NOT NULL REFERENCES users (user_id),
    post_id            BIGINT     NOT NULL REFERENCES posts (post_id)
                       ON DELETE CASCADE,
    comment_body       TEXT       NOT NULL,
    comment_timestamp  TIMESTAMP  NOT NULL
);

CREATE TABLE comment_replies (
    comment_id         BIGINT  PRIMARY KEY
                       REFERENCES comments (comment_id) ON DELETE CASCADE,
    parent_comment_id  BIGINT  NOT NULL
                       REFERENCES comments (comment_id) ON DELETE CASCADE,
    CHECK (comment_id <> parent_comment_id)
);

CREATE FUNCTION check_reply_same_post() RETURNS trigger AS $$
BEGIN
    IF (SELECT post_id FROM comments WHERE comment_id = NEW.comment_id)
       IS DISTINCT FROM
       (SELECT post_id FROM comments
         WHERE comment_id = NEW.parent_comment_id) THEN
        RAISE EXCEPTION
            'Reply % must belong to the same post as its parent %',
            NEW.comment_id, NEW.parent_comment_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reply_same_post
    BEFORE INSERT OR UPDATE ON comment_replies
    FOR EACH ROW EXECUTE FUNCTION check_reply_same_post();

CREATE TABLE reactions (
    user_id             INTEGER    REFERENCES users (user_id)
                        ON DELETE CASCADE,
    post_id             BIGINT     REFERENCES posts (post_id)
                        ON DELETE CASCADE,
    action_type         reaction_t,
    reaction_timestamp  TIMESTAMP  NOT NULL,
    PRIMARY KEY (user_id, post_id, action_type)
);

CREATE TABLE follows (
    follower_id  INTEGER  REFERENCES users (user_id) ON DELETE CASCADE,
    followee_id  INTEGER  REFERENCES users (user_id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);

CREATE TABLE flag_reports (
    report_id         BIGINT         PRIMARY KEY,
    reporter_id       INTEGER        NOT NULL REFERENCES users (user_id),
    post_id           BIGINT         NOT NULL REFERENCES posts (post_id),
    reason            flag_reason_t  NOT NULL,
    report_timestamp  TIMESTAMP      NOT NULL,
    extra_note        VARCHAR(255)
);

CREATE TABLE moderator_reviews (
    review_id         BIGINT        PRIMARY KEY,
    report_id         BIGINT        NOT NULL
                      REFERENCES flag_reports (report_id),
    moderator_id      INTEGER       NOT NULL
                      REFERENCES moderation_leads (user_id),
    action_taken      VARCHAR(60)   NOT NULL,
    final_decision    decision_t    NOT NULL,
    decision_note     VARCHAR(255),
    review_timestamp  TIMESTAMP     NOT NULL
);

CREATE TABLE topic_mastery (
    user_id         INTEGER       REFERENCES solvers (user_id)
                    ON DELETE CASCADE,
    topic_id        INTEGER       REFERENCES topics (topic_id),
    topic_accuracy  NUMERIC(5,2)  NOT NULL DEFAULT 0
                    CHECK (topic_accuracy BETWEEN 0 AND 100),
    PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX idx_submissions_user_problem
    ON submissions (user_id, problem_id, submission_timestamp DESC);
CREATE INDEX idx_submissions_contest_time
    ON submissions (contest_id, submission_timestamp)
    WHERE contest_id IS NOT NULL;
CREATE INDEX idx_submissions_code_hash
    ON submissions (code_hash);
CREATE INDEX idx_posts_problem
    ON posts (problem_id, creation_timestamp DESC);
CREATE INDEX idx_flag_reports_post
    ON flag_reports (post_id);
