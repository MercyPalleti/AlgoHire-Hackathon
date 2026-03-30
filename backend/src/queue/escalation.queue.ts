import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!);

export const escalationQueue = new Queue("escalation-queue", {
  connection,
});