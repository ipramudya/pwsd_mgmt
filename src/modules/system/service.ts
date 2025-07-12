import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import type { SystemHealthInfo } from './repository';
import { SystemRepository } from './repository';

export class SystemService {
  private repository: SystemRepository;
  private logger: ReturnType<typeof getLogger>;
  private startTime: number;

  constructor(c: AppContext) {
    this.repository = new SystemRepository(c);
    this.logger = getLogger(c, 'system-service');
    this.startTime = Date.now();
  }

  async getHealthCheck(): Promise<SystemHealthInfo> {
    this.logger.info('Performing system health check');

    const databaseHealth = await this.repository.checkDatabaseHealth();

    // Determine overall system status
    let status: SystemHealthInfo['status'] = 'healthy';

    if (databaseHealth.status === 'disconnected') {
      status = 'unhealthy';
    } else if (databaseHealth.responseTime > 1000) {
      // Consider degraded if database response time is over 1 second
      status = 'degraded';
    }

    const healthInfo: SystemHealthInfo = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      database: databaseHealth,
      version: '1.0.0', // This could be read from package.json or env
      environment: 'production', // This could be read from env
    };

    this.logger.info(
      {
        status: healthInfo.status,
        databaseStatus: databaseHealth.status,
        databaseResponseTime: databaseHealth.responseTime,
      },
      'System health check completed'
    );

    return healthInfo;
  }

  async getDetailedHealthCheck(): Promise<SystemHealthInfo> {
    this.logger.info('Performing detailed system health check');

    const [databaseHealth, databaseStats] = await Promise.all([
      this.repository.checkDatabaseHealth(),
      this.repository.getDatabaseStats(),
    ]);

    // Determine overall system status
    let status: SystemHealthInfo['status'] = 'healthy';

    if (databaseHealth.status === 'disconnected') {
      status = 'unhealthy';
    } else if (databaseHealth.responseTime > 1000) {
      // Consider degraded if database response time is over 1 second
      status = 'degraded';
    }

    // Combine database health with database stats
    const enhancedDatabaseHealth = {
      ...databaseHealth,
      accountCount: databaseStats.totalAccounts,
      blockCount: databaseStats.totalBlocks,
      fieldCount: databaseStats.totalFields,
    };

    const detailedHealthInfo: SystemHealthInfo = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      database: enhancedDatabaseHealth,
      version: '1.0.0', // This could be read from package.json or env
      environment: 'production', // This could be read from env
    };

    this.logger.info(
      {
        status: detailedHealthInfo.status,
        databaseStatus: databaseHealth.status,
        databaseStats: {
          accountCount: databaseStats.totalAccounts,
          blockCount: databaseStats.totalBlocks,
          fieldCount: databaseStats.totalFields,
        },
      },
      'Detailed system health check completed'
    );

    return detailedHealthInfo;
  }
}
