import { Request, Response } from "express";
import { pool } from "../../db/db";

export const getSensorHistory = async (req: Request, res: Response) => {
  const { sensorId } = req.params;
  const { from, to, page = 1 } = req.query;

  const limit = 100;
  const offset = (Number(page) - 1) * limit;

  try {
    const result = await pool.query(
      `
      SELECT 
        r.id,
        r.timestamp,
        r.voltage,
        r.temperature,
        CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS has_anomaly,
        al.id AS alert_id
      FROM readings r
      LEFT JOIN anomalies a ON a.reading_id = r.id
      LEFT JOIN alerts al ON al.anomaly_id = a.id
      WHERE r.sensor_id = $1
      AND r.timestamp BETWEEN $2 AND $3
      ORDER BY r.timestamp DESC
      LIMIT $4 OFFSET $5
      `,
      [sensorId, from, to, limit, offset]
    );

    res.json({
      data: result.rows,
      page: Number(page),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};