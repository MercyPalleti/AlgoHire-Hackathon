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

      //  BULK INSERT
      const values = readings
        .map(
          (_, i) =>
            `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
        )
        .join(",");

      const flatValues = readings.flatMap((r) => [
        r.sensor_id,
        r.timestamp,
        r.voltage,
        r.current,
        r.temperature,
        r.status_code,
      ]);

      const result = await client.query(
        `INSERT INTO readings 
        (sensor_id, timestamp, voltage, current, temperature, status_code)
        VALUES ${values}
        RETURNING id, sensor_id, voltage, temperature`,
        flatValues
      );

      await client.query("COMMIT");

      // push to queue (already enriched with DB ids)
      await ingestQueue.add("process-readings", result.rows);

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




