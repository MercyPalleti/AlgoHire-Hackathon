import { Request, Response } from "express";
import { pool } from "../../db/db";

// ACKNOWLEDGE
export const acknowledgeAlert = async (req: Request, res: Response) => {
  const alertId = req.params.id;
  const userId = 1; // mock user (replace later)

  const alertRes = await pool.query(
    "SELECT * FROM alerts WHERE id=$1",
    [alertId]
  );

  const alert = alertRes.rows[0];

  if (!alert) return res.status(404).json({ error: "Not found" });

  if (alert.status !== "open") {
    return res.status(400).json({ error: "Invalid transition" });
  }

  await pool.query(
    "UPDATE alerts SET status='acknowledged' WHERE id=$1",
    [alertId]
  );

  await pool.query(
    `INSERT INTO alert_logs (alert_id, from_status, to_status, changed_by)
     VALUES ($1,$2,$3,$4)`,
    [alertId, "open", "acknowledged", userId]
  );

  res.json({ success: true });
};

// RESOLVE
export const resolveAlert = async (req: Request, res: Response) => {
  const alertId = req.params.id;
  const userId = 1;

  const alertRes = await pool.query(
    "SELECT * FROM alerts WHERE id=$1",
    [alertId]
  );

  const alert = alertRes.rows[0];

  if (!alert) return res.status(404).json({ error: "Not found" });

  if (alert.status === "resolved") {
    return res.status(400).json({ error: "Already resolved" });
  }

  await pool.query(
    "UPDATE alerts SET status='resolved' WHERE id=$1",
    [alertId]
  );

  await pool.query(
    `INSERT INTO alert_logs (alert_id, from_status, to_status, changed_by)
     VALUES ($1,$2,$3,$4)`,
    [alertId, alert.status, "resolved", userId]
  );

  res.json({ success: true });
};