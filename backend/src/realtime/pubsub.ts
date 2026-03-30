import IORedis from "ioredis";

export const pub = new IORedis(process.env.REDIS_URL!);
export const sub = new IORedis(process.env.REDIS_URL!);