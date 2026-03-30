import { pool } from "../db/db";
import { escalationQueue } from "../queue/escalation.queue";
import { pub } from "../realtime/pubsub";

const CHECK_INTERVAL = 60 * 1000; // every 60 sec

export const startPatternWorker = () => {
  setInterval(async () => {
    try {
      // find sensors with no readings in last 2 min
      const result = await pool.query(`
        SELECT s.id, s.zone_id
        FROM sensors s
        LEFT JOIN readings r 
        ON s.id = r.sensor_id 
        AND r.timestamp > NOW() - INTERVAL '2 minutes'
        WHERE r.id IS NULL
      `);

      for (const sensor of result.rows) {
        // create anomaly (type C)
        const anomaly = await pool.query(
          `INSERT INTO anomalies (sensor_id, type)
           VALUES ($1,$2) RETURNING id`,
          [sensor.id, "C"]
        );

        // create alert
        const alert = await pool.query(
          `INSERT INTO alerts (sensor_id, anomaly_id, severity)
           VALUES ($1,$2,$3) RETURNING *`,
          [sensor.id, anomaly.rows[0].id, "critical"]
        );

        await escalationQueue.add(
          "escalate",
          { alertId: alert.rows[0].id },
          { delay: 5 * 60 * 1000 }
        );

        // publish real-time event
        await pub.publish(
          "alerts",
          JSON.stringify({
            sensor_id: sensor.id,
            zone_id: sensor.zone_id,
            status: "silent",
          })
        );
      }
    } catch (err) {
      console.error("Pattern worker error:", err);
    }
  }, CHECK_INTERVAL);
};