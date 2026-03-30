import express from "express";
import { ingestController } from "../controllers/ingest.controller";

const router = express.Router();

router.post("/ingest", ingestController);

export default router;