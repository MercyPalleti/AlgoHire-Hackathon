import express from "express";
import { getSensorHistory } from "../controllers/history.controller";

const router = express.Router();

router.get("/:sensorId", getSensorHistory);

export default router;