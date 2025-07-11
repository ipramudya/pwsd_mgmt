import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { accounts, blocks, fields } from '../../lib/schemas';
import type { AppContext } from '../../types';

export interface DatabaseHealthInfo {
  connected: boolean;
  responseTime: number;
  error?: string;
}

export interface SystemHealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: DatabaseHealthInfo;
  version: string;
  environment: string;
}

export class SystemRepository {
  private db: ReturnType<typeof drizzle>;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.db = drizzle(c.env.DB);
    this.logger = getLogger(c, 'system-repository');
  }

  checkDatabaseHealth(): DatabaseHealthInfo {
    const startTime = performance.now();

    try {
      this.logger.info('Checking database connectivity');

      // Perform a simple query to test database connectivity
      this.db.select({ test: sql`1` });

      const responseTime = performance.now() - startTime;

      this.logger.info(
        { responseTime: Math.round(responseTime) },
        'Database health check successful'
      );

      return {
        connected: true,
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      this.logger.error(
        { error, responseTime: Math.round(responseTime) },
        'Database health check failed'
      );

      return {
        connected: false,
        responseTime: Math.round(responseTime),
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  async getDatabaseStats(): Promise<{
    totalAccounts: number;
    totalBlocks: number;
    totalFields: number;
  }> {
    try {
      this.logger.info('Fetching database statistics');

      const [accountsResult] = await this.db
        .select({ count: sql`COUNT(*)` })
        .from(accounts);

      const [blocksResult] = await this.db
        .select({ count: sql`COUNT(*)` })
        .from(blocks);

      const [fieldsResult] = await this.db
        .select({ count: sql`COUNT(*)` })
        .from(fields);

      const stats = {
        totalAccounts: Number(accountsResult.count) || 0,
        totalBlocks: Number(blocksResult.count) || 0,
        totalFields: Number(fieldsResult.count) || 0,
      };

      this.logger.info(stats, 'Database statistics retrieved successfully');
      return stats;
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch database statistics');
      throw new DatabaseError('Failed to fetch database statistics', { error });
    }
  }
}
