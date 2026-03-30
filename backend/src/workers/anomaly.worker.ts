import { Worker } from "bullmq";
import IORedis from "ioredis";
import { pool } from "../db/db";
import { pub } from "../realtime/pubsub";
import { escalationQueue } from "../queue/escalation.queue";


const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});


new Worker(
  "ingest-queue",
  async (job) => {
    const readings = job.data;

    for (const r of readings) {
      // Example Rule A (threshold)
      const sensorRes = await pool.query(
        "SELECT * FROM sensors WHERE id=$1",
        [r.sensor_id]
      );

      const sensor = sensorRes.rows[0];

      if (!sensor) continue;

      let anomalyType = null;

      if (
        r.voltage < sensor.min_voltage ||
        r.voltage > sensor.max_voltage ||
        r.temperature < sensor.min_temp ||
        r.temperature > sensor.max_temp
      ) {
        anomalyType = "A";
      }

      if (anomalyType) {
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

        await escalationQueue.add(
          "escalate",
          { alertId: alert.rows[0].id },
          { delay: 5 * 60 * 1000 } // 5 minutes
        );

        const sensorZone = await pool.query(
            "SELECT zone_id FROM sensors WHERE id=$1",
            [r.sensor_id]
        );

        await pub.publish(
            "alerts",
            JSON.stringify({
            sensor_id: r.sensor_id,
            zone_id: sensorZone.rows[0].zone_id,
            status: "critical",
            })
        );
      }
    }
  },
  { connection }
);