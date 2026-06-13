// import IORedis from "ioredis";

// export const connection = new IORedis({
//   host: "127.0.0.1",
//   port: 6379,
//   maxRetriesPerRequest: null,
// });

// export const defaultJobOptions = {
//   attempts: 3,
//   backoff: {
//     type: "exponential",
//     delay: 2000,
//   },
//   // removeOnComplete: true,
//   removeOnComplete: {
//     age: 3600,
//   },
//   removeOnFail: false,
// };

import IORedis from "ioredis";

export const connection = new IORedis(
  process.env.REDIS_URL as string,
  {
    maxRetriesPerRequest: null,
  }
);

connection.on("connect", () => {
  console.log("✅ Redis connected");
});

connection.on("error", (err) => {
  console.error("❌ Redis error:", err);
});