-- AeroSwift AI — PostgreSQL schema + CSV import
-- Run with: psql -U <user> -d <database> -f schema.sql

CREATE TABLE IF NOT EXISTS flights (
    flightNumber      VARCHAR,
    departureAirport  VARCHAR,
    departureTime     VARCHAR,
    arrivalAirport    VARCHAR,
    arrivalTime       VARCHAR,
    flightStatus      VARCHAR
);

-- Import CSVs (paths relative to where psql is run; adjust if needed)
-- \COPY runs client-side so it uses local file paths

\COPY flights     FROM '/data/flight_data.csv' WITH (FORMAT csv, HEADER true);