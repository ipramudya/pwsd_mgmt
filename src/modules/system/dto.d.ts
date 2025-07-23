export interface DatabaseHealthInfo {
  status: 'connected' | 'disconnected';
  responseTime: number;
  error?: string;
  accountCount?: number;
  blockCount?: number;
  fieldCount?: number;
}

export interface SystemHealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: DatabaseHealthInfo;
  version: string;
  environment: string;
}
