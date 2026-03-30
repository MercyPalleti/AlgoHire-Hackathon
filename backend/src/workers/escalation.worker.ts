import { Worker } from "bullmq";
import IORedis from "ioredis";
import { pool } from "../db/db";

//const connection = new IORedis(process.env.REDIS_URL!);

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});


new Worker(
  "escalation-queue",
  async (job) => {
    const { alertId } = job.data;

    const alertRes = await pool.query(
      "SELECT * FROM alerts WHERE id=$1",
      [alertId]
    );

    const alert = alertRes.rows[0];
    if (!alert) return;

    // if already acknowledged/resolved → skip
    if (alert.status !== "open") return;

    // check already escalated
    const existing = await pool.query(
      "SELECT * FROM escalation_log WHERE alert_id=$1",
      [alertId]
    );

    if (existing.rows.length > 0) return;

    // find supervisor
    const supervisor = await pool.query(
      "SELECT id FROM users WHERE role='supervisor' LIMIT 1"
    );

    const supervisorId = supervisor.rows[0]?.id;

    await pool.query(
      `INSERT INTO escalation_log (alert_id, escalated_to)
       VALUES ($1,$2)`,
      [alertId, supervisorId]
    );

    console.log("Escalated alert:", alertId);
  },
  { connection }
);