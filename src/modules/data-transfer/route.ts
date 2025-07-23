import { Hono } from 'hono';
import { inject, injectable } from 'tsyringe';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import DataTransferService from './service';
import { dataTransferValidations } from './validation';

@injectable()
export default class DataTransferRoute {
  readonly route: Hono<AppHono>;

  constructor(
    @inject(DataTransferService)
    private readonly service: DataTransferService
  ) {
    this.route = new Hono<AppHono>();
    this.route.use(authMiddleware);
    this.setupRoutes();
  }

  private setupRoutes() {
    this.useExportDataRoute();
    this.useImportDataRoute();
  }

  private useExportDataRoute() {
    this.route.post(
      '/export',
      dataTransferValidations.exportData,
      async (c) => {
        const body = c.req.valid('json');
        const userId = c.get('userId') as string;

        const result = await this.service.exportUserData(c, body, userId);

        return new Response(result.fileData, {
          headers: {
            'Content-Type': result.contentType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'Content-Length': result.contentLength.toString(),
          },
        });
      }
    );
  }

  private useImportDataRoute() {
    this.route.post(
      '/import',
      dataTransferValidations.importData,
      async (c) => {
        const formData = c.req.valid('form');
        const userId = c.get('userId') as string;

        const result = await this.service.importUserData(c, formData, userId);

        const statusCode = result.success ? 200 : 400;
        return c.json(
          {
            success: result.success,
            data: result,
            message: result.success
              ? 'User data imported successfully'
              : 'User data import completed with errors',
          },
          statusCode
        );
      }
    );
  }
}
