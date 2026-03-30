import express from "express";
import {
  acknowledgeAlert,
  resolveAlert,
} from "../controllers/alert.controller";

const router = express.Router();

router.post("/:id/acknowledge", acknowledgeAlert);
router.post("/:id/resolve", resolveAlert);

export default router;