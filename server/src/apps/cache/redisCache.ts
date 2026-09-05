import type { Batch } from "@myapp/db";
import { connection } from "@myapp/shared/redisConnection";
import Redis from "ioredis";

export class RedisCache {
    private static redisConnection = new Redis({
        host: connection.host,
        port: connection.port,
    });
    public static async writeBatchesToCache(batches: Batch[]) {
        // Write the batches to Redis with a TTL of 30 seconds
        this.redisConnection.set('batches', JSON.stringify(batches), "EX", 30);
    }
    public static async getBatchesFromCache() {
        const batches = await this.redisConnection.get('batches');
        if (batches) {
            return JSON.parse(batches) as Batch[];
        }
        return null;
    }
    public static async clearBatchesCache() {
        await this.redisConnection.del('batches');
    }
}