import Redis from "ioredis";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";

class RedisService {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: ENV.REDIS_HOST || "localhost",
            port: Number(ENV.REDIS_PORT) || 6379,
            password: ENV.REDIS_PASSWORD || "" 
        });

        this.client.on("connect", () => {
            logger.info({ message: "Connected to Redis", context: "RedisService" });
        });

        this.client.on("error", (error) => {
            logger.error({ message: "Redis Error", context: "RedisService", error: error.message });
        });
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: any, expirySeconds?: number): Promise<void> {
        const stringValue = typeof value === "string" ? value : JSON.stringify(value);
        if (expirySeconds) {
            await this.client.setex(key, expirySeconds, stringValue);
        } else {
            await this.client.set(key, stringValue);
        }
    }

    async delete(key: string): Promise<void> {
        await this.client.del(key);
    }
}

export const redisService = new RedisService();