CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  skills JSONB NOT NULL,
  years_of_experience NUMERIC NOT NULL CHECK (years_of_experience >= 0),
  location TEXT NOT NULL,
  expected_salary NUMERIC NOT NULL CHECK (expected_salary >= 0)
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  required_skills JSONB NOT NULL,
  min_years_experience NUMERIC NOT NULL CHECK (min_years_experience >= 0),
  location TEXT NOT NULL,
  salary_range JSONB NOT NULL,
  remote_allowed BOOLEAN NOT NULL
);
