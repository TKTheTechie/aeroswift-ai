-- AeroSwift AI — PostgreSQL schema + CSV import
-- Run with: psql -U <user> -d <database> -f schema.sql

CREATE TABLE IF NOT EXISTS ff_benefits (
    tier    VARCHAR,
    perkId  VARCHAR,
    perk    VARCHAR
);

CREATE TABLE IF NOT EXISTS ff_tiers (
    tier  VARCHAR,
    miles INTEGER
);

CREATE TABLE IF NOT EXISTS member_status (
    ffNumber VARCHAR PRIMARY KEY,
    status   VARCHAR
);

CREATE TABLE IF NOT EXISTS member_profiles (
    id          VARCHAR PRIMARY KEY,
    firstName   VARCHAR,
    lastName    VARCHAR,
    address     VARCHAR,
    aptNumber   VARCHAR,
    city        VARCHAR,
    state       VARCHAR,
    country     VARCHAR,
    zipcode     VARCHAR,
    birthdate   DATE
);

CREATE TABLE IF NOT EXISTS member_flights (
    ffNumber     VARCHAR,
    flightNumber VARCHAR
);

-- Import CSVs (paths relative to where psql is run; adjust if needed)
-- \COPY runs client-side so it uses local file paths

\COPY ff_benefits     FROM '/data/ff_benefits.csv'    WITH (FORMAT csv, HEADER true);
\COPY ff_tiers        FROM '/data/ff_tiers.csv'       WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\COPY member_status   FROM '/data/member_status.csv'  WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\COPY member_profiles FROM '/data/member_profiles.csv' WITH (FORMAT csv, HEADER true);
\COPY member_flights  FROM '/data/member_flights.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
