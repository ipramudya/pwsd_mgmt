import { container, inject, injectable } from 'tsyringe';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import type { SystemHealthInfo } from './dto';
import SystemRepository from './repository';

@injectable()
export default class SystemService {
  private readonly startTime: number;

  constructor(
    @inject(SystemRepository)
    private readonly repository: SystemRepository
  ) {
    this.startTime = Date.now();
  }

  getHealthCheck(c: AppContext): SystemHealthInfo {
    const logger = getLogger(c, 'system-service');

    const databaseHealth = this.repository.checkDatabaseHealth(c);

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

    logger.info(
      {
        status: healthInfo.status,
        databaseStatus: databaseHealth.status,
        databaseResponseTime: databaseHealth.responseTime,
      },
      'System health check completed'
    );

    return healthInfo;
  }

  async getDetailedHealthCheck(c: AppContext): Promise<SystemHealthInfo> {
    const logger = getLogger(c, 'system-service');

    logger.info('Performing detailed system health check');

    const databaseHealth = this.repository.checkDatabaseHealth(c);
    const databaseStats = await this.repository.getDatabaseStats(c);

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

    logger.info(
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

container.registerSingleton(SystemService);
