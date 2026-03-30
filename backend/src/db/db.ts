import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Optional: test connection on startup
pool.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch((err) => console.error("❌ DB connection error", err));