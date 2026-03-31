import { Worker } from "bullmq";
import IORedis from "ioredis";
import { pool } from "../db/db";
import { pub } from "../realtime/pubsub";
import { escalationQueue } from "../queue/escalation.queue";

const connection = new IORedis(process.env.REDIS_URL!);

new Worker(
  "ingest-queue",
  async (job) => {
    const readings = job.data;

    //  LOAD ALL SENSORS ONCE
    const sensorsRes = await pool.query("SELECT * FROM sensors");
    const sensorMap = new Map();

    sensorsRes.rows.forEach((s) => {
      sensorMap.set(s.id, s);
    });

    //  PROCESS IN PARALLEL
    await Promise.all(
      readings.map(async (r) => {
        const sensor = sensorMap.get(r.sensor_id);
        if (!sensor) return;

        let anomalyType = null;

        // Rule A
        if (
          r.voltage < sensor.min_voltage ||
          r.voltage > sensor.max_voltage ||
          r.temperature < sensor.min_temp ||
          r.temperature > sensor.max_temp
        ) {
          anomalyType = "A";
        }

        if (!anomalyType) return;

        const anomaly = await pool.query(
          `INSERT INTO anomalies (reading_id, sensor_id, type)
           VALUES ($1,$2,$3) RETURNING id`,
          [r.id, r.sensor_id, anomalyType]
        );

        const alert = await pool.query(
          `INSERT INTO alerts (sensor_id, anomaly_id, severity)
           VALUES ($1,$2,$3) RETURNING *`,
          [r.sensor_id, anomaly.rows[0].id, "critical"]
        );

        // 🔥 ESCALATION (DELAYED)
        await escalationQueue.add(
          "escalate",
          { alertId: alert.rows[0].id },
          { delay: 5 * 60 * 1000 }
        );

        // 🔥 REAL-TIME EVENT
        await pub.publish(
          "alerts",
          JSON.stringify({
            sensor_id: r.sensor_id,
            zone_id: sensor.zone_id,
            status: "critical",
          })
        );
      })
    );
  },
  { connection }
);




