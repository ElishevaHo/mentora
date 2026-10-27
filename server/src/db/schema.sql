-- Mentora schema. Every statement is idempotent so it can run on each boot.

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  password_hash     TEXT        NOT NULL,
  role              TEXT        NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'tutor', 'admin')),
  is_blocked        BOOLEAN     NOT NULL DEFAULT FALSE,
  avatar            BYTEA,
  avatar_mime       TEXT,
  avatar_updated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '📘'
);

CREATE TABLE IF NOT EXISTS tutor_profiles (
  user_id           INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline          TEXT    NOT NULL DEFAULT '',
  bio               TEXT    NOT NULL DEFAULT '',
  city              TEXT    NOT NULL DEFAULT '',
  hourly_rate       INT     NOT NULL DEFAULT 120 CHECK (hourly_rate BETWEEN 30 AND 1000),
  teaches_online    BOOLEAN NOT NULL DEFAULT TRUE,
  teaches_in_person BOOLEAN NOT NULL DEFAULT FALSE,
  years_experience  INT     NOT NULL DEFAULT 0 CHECK (years_experience BETWEEN 0 AND 60),
  is_published      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tutor_subjects (
  tutor_id   INT NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (tutor_id, subject_id)
);

-- Weekly recurring availability, in Israel local time. weekday: 0 = Sunday.
CREATE TABLE IF NOT EXISTS availability (
  id         SERIAL PRIMARY KEY,
  tutor_id   INT      NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
  weekday    SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_hour SMALLINT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour   SMALLINT NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  CHECK (end_hour > start_hour)
);

CREATE TABLE IF NOT EXISTS lessons (
  id         SERIAL PRIMARY KEY,
  tutor_id   INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INT         REFERENCES subjects(id) ON DELETE SET NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  mode       TEXT        NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'in_person')),
  note       TEXT        NOT NULL DEFAULT '',
  price      INT         NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A tutor can't have two live bookings for the same hour.
CREATE UNIQUE INDEX IF NOT EXISTS lessons_live_slot
  ON lessons (tutor_id, starts_at) WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS lessons_student ON lessons (student_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  lesson_id  INT         NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  tutor_id   INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_tutor ON reviews (tutor_id);

CREATE TABLE IF NOT EXISTS messages (
  id           SERIAL PRIMARY KEY,
  sender_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_recipient ON messages (recipient_id, read_at);
CREATE INDEX IF NOT EXISTS messages_sender ON messages (sender_id);
