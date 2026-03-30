-- USERS & ZONES
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  role TEXT CHECK (role IN ('operator', 'supervisor')),
  zone_id INT REFERENCES zones(id)
);

-- SENSORS
CREATE TABLE sensors (
  id TEXT PRIMARY KEY,
  zone_id INT REFERENCES zones(id),
  min_voltage FLOAT,
  max_voltage FLOAT,
  min_temp FLOAT,
  max_temp FLOAT,
  rate_threshold FLOAT
);

-- READINGS (HIGH VOLUME)
CREATE TABLE readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id TEXT REFERENCES sensors(id),
  timestamp TIMESTAMP NOT NULL,
  voltage FLOAT,
  current FLOAT,
  temperature FLOAT,
  status_code INT
);

-- INDEX (VERY IMPORTANT)
CREATE INDEX idx_readings_sensor_time 
ON readings(sensor_id, timestamp DESC);

-- ANOMALIES
CREATE TABLE anomalies (
  id BIGSERIAL PRIMARY KEY,
  reading_id BIGINT REFERENCES readings(id),
  sensor_id TEXT,
  type TEXT, -- A, B, C
  created_at TIMESTAMP DEFAULT NOW()
);

-- ALERTS
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  sensor_id TEXT,
  anomaly_id BIGINT REFERENCES anomalies(id),
  status TEXT CHECK (status IN ('open','acknowledged','resolved')) DEFAULT 'open',
  severity TEXT CHECK (severity IN ('warning','critical')),
  suppressed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ALERT AUDIT LOG (APPEND ONLY)
CREATE TABLE alert_logs (
  id BIGSERIAL PRIMARY KEY,
  alert_id BIGINT,
  from_status TEXT,
  to_status TEXT,
  changed_by INT,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- SUPPRESSION
CREATE TABLE suppression (
  id SERIAL PRIMARY KEY,
  sensor_id TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP
);

-- ESCALATION LOG
CREATE TABLE escalation_log (
  id SERIAL PRIMARY KEY,
  alert_id BIGINT,
  escalated_to INT,
  created_at TIMESTAMP DEFAULT NOW()
);