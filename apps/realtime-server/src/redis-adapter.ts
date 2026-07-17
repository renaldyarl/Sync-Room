import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

export async function buildRedisAdapter() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set");
  }

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  return createAdapter(pubClient, subClient);
}
