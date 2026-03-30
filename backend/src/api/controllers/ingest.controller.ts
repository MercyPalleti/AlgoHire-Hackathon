import { Request, Response } from "express";
import { pool } from "../../db/db";
import { ingestQueue } from "../../queue/queue";

export const ingestController = async (req: Request, res: Response) => {
  const readings = req.body;

  if (!Array.isArray(readings) || readings.length > 1000) {
    return res.status(400).json({ error: "Invalid batch" });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const insertQuery = `
        INSERT INTO readings 
        (sensor_id, timestamp, voltage, current, temperature, status_code)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id
      `;

      const insertedReadings = [];

      for (const r of readings) {
        const result = await client.query(insertQuery, [
          r.sensor_id,
          r.timestamp,
          r.voltage,
          r.current,
          r.temperature,
          r.status_code,
        ]);

        insertedReadings.push({
          ...r,
          id: result.rows[0].id,
        });
      }

      await client.query("COMMIT");

      // push to queue (async processing)
      await ingestQueue.add("process-readings", insertedReadings);

      return res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal error" });
  }
};