import { pool } from "./db";

const random = (min: number, max: number) =>
  Math.random() * (max - min) + min;

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ZONES
    await client.query(`
      INSERT INTO zones (name) VALUES 
      ('Zone A'), ('Zone B'), ('Zone C')
    `);

    // USERS
    await client.query(`
      INSERT INTO users (name, role, zone_id) VALUES
      ('Operator 1', 'operator', 1),
      ('Operator 2', 'operator', 2),
      ('Supervisor', 'supervisor', NULL)
    `);

    // SENSORS (1000)
    for (let i = 1; i <= 1000; i++) {
      const zoneId = (i % 3) + 1;

      await client.query(
        `INSERT INTO sensors 
        (id, zone_id, min_voltage, max_voltage, min_temp, max_temp, rate_threshold)
        VALUES ($1,$2,210,240,10,80,20)`,
        [`sensor_${i}`, zoneId]
      );
    }

    // READINGS (48 hours, every ~30 min)
    const now = new Date();

    for (let i = 1; i <= 1000; i++) {
      for (let j = 0; j < 96; j++) {
        const timestamp = new Date(now.getTime() - j * 30 * 60000);

        await client.query(
          `INSERT INTO readings 
          (sensor_id, timestamp, voltage, current, temperature, status_code)
          VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            `sensor_${i}`,
            timestamp,
            random(200, 250),
            random(5, 20),
            random(5, 90),
            1,
          ]
        );
      }
    }

    await client.query("COMMIT");

    console.log("✅ Seed completed");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
  } finally {
    client.release();
  }
}

seed();