import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

connection.on("connect", () => {
  console.log("Redis connected");
});

connection.on("error", (err) => {
  console.error("Redis error:", err);
});

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600,
  },
  removeOnFail: false,
};
