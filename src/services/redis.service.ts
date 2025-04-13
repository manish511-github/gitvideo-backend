import Redis from "ioredis";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";

class RedisService {
    private client: Redis | null = null;
    private connected: boolean = false;

    constructor() {
        setTimeout(() => {
            this.initRedis();
        }, 5 * 60 * 1000); // 5 minutes delay
    }

    private initRedis() {
        this.client = new Redis({
            host: ENV.REDIS_HOST || "localhost",
            port: Number(ENV.REDIS_PORT) || 6379,
            password: ENV.REDIS_PASSWORD || "",
            retryStrategy: () => {
                // Disable auto-reconnect
                return null;
            },
        });

        this.client.on("connect", () => {
            this.connected = true;
            logger.info({ message: "Connected to Redis", context: "RedisService" });
        });

        this.client.on("error", (error) => {
            if (error.code === "ECONNREFUSED") {
                if (this.connected) {
                    logger.warn({ message: "Redis is offline. Skipping Redis operations.", context: "RedisService" });
                    this.connected = false;
                }
            } else {
                logger.error({ message: "Redis Error", context: "RedisService", error: error.message });
            }
        });
    }

    private isConnected(): boolean {
        return this.connected && this.client?.status === "ready";
    }

    async get(key: string): Promise<string | null> {
        if (!this.isConnected()) return null;
        return this.client!.get(key);
    }

    async set(key: string, value: any, expirySeconds?: number): Promise<void> {
        if (!this.isConnected()) return;
        const stringValue = typeof value === "string" ? value : JSON.stringify(value);
        if (expirySeconds) {
            await this.client!.setex(key, expirySeconds, stringValue);
        } else {
            await this.client!.set(key, stringValue);
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.isConnected()) return;
        await this.client!.del(key);
    }
}

export const redisService = new RedisService();