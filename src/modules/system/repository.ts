import { performance } from 'node:perf_hooks';

import { sql } from 'drizzle-orm';
import { container, injectable } from 'tsyringe';

import { createDatabase } from '../../lib/database';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { accounts, blocks, fields } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { DatabaseHealthInfo } from './dto';

@injectable()
export default class SystemRepository {
  checkDatabaseHealth(c: AppContext): DatabaseHealthInfo {
    const logger = getLogger(c, 'system-repository');
    const db = createDatabase(c);
    const startTime = performance.now();

    try {
      logger.info('Checking database connectivity');

      // Perform a simple query to test database connectivity
      db.select({ test: sql`1` });

      const responseTime = performance.now() - startTime;

      logger.info(
        { responseTime: Math.round(responseTime) },
        'Database health check successful'
      );

      return {
        status: 'connected',
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error(
        { error, responseTime: Math.round(responseTime) },
        'Database health check failed'
      );

      return {
        status: 'disconnected',
        responseTime: Math.round(responseTime),
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  async getDatabaseStats(c: AppContext): Promise<{
    totalAccounts: number;
    totalBlocks: number;
    totalFields: number;
  }> {
    const logger = getLogger(c, 'system-repository');
    const db = createDatabase(c);

    try {
      logger.info('Fetching database statistics');

      const [accountsResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(accounts);

      const [blocksResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(blocks);

      const [fieldsResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(fields);

      const stats = {
        totalAccounts: Number(accountsResult.count) || 0,
        totalBlocks: Number(blocksResult.count) || 0,
        totalFields: Number(fieldsResult.count) || 0,
      };

      logger.info(stats, 'Database statistics retrieved successfully');
      return stats;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch database statistics');
      throw new DatabaseError('Failed to fetch database statistics', { error });
    }
  }
}

container.registerSingleton(SystemRepository);
