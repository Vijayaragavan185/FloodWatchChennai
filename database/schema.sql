-- =====================================================================
-- FloodWatch Chennai : database schema (MySQL 8.0.31+ / H2 in MySQL mode)
-- Owned by report-service (applied automatically at start-up).
-- The ALERTS table is created separately by alert-service through JDBC.
-- =====================================================================

CREATE TABLE IF NOT EXISTS wards (
    id          INT          PRIMARY KEY,
    code        VARCHAR(8)   NOT NULL UNIQUE,
    name        VARCHAR(60)  NOT NULL,
    zone        VARCHAR(40)  NOT NULL,
    grid_row    INT          NOT NULL,
    grid_col    INT          NOT NULL
);

CREATE TABLE IF NOT EXISTS streets (
    id          INT          PRIMARY KEY,
    ward_id     INT          NOT NULL,
    name        VARCHAR(100) NOT NULL,
    low_lying   BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_street_ward FOREIGN KEY (ward_id) REFERENCES wards(id)
);

CREATE TABLE IF NOT EXISTS app_users (
    id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
    full_name   VARCHAR(80)  NOT NULL,
    phone       VARCHAR(15)  NOT NULL UNIQUE,
    role        VARCHAR(10)  NOT NULL DEFAULT 'CITIZEN',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
    street_id   INT          NOT NULL,
    user_id     BIGINT       NOT NULL,
    severity    INT          NOT NULL,
    depth_cm    INT          NOT NULL,
    description VARCHAR(500),
    status      VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
    reported_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_street FOREIGN KEY (street_id) REFERENCES streets(id),
    CONSTRAINT fk_report_user   FOREIGN KEY (user_id)   REFERENCES app_users(id),
    CONSTRAINT chk_severity CHECK (severity BETWEEN 1 AND 5),
    CONSTRAINT chk_depth    CHECK (depth_cm BETWEEN 0 AND 300)
);

CREATE TABLE IF NOT EXISTS votes (
    id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
    report_id   BIGINT       NOT NULL,
    user_id     BIGINT       NOT NULL,
    vote_type   VARCHAR(8)   NOT NULL,
    voted_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vote_report FOREIGN KEY (report_id) REFERENCES reports(id),
    CONSTRAINT fk_vote_user   FOREIGN KEY (user_id)   REFERENCES app_users(id),
    CONSTRAINT uq_one_vote    UNIQUE (report_id, user_id)
);
