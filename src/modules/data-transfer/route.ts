import { Hono } from 'hono';
import { authMiddleware } from '../../lib/auth-middleware';
import type { AppHono } from '../../types';
import { DataTransferService } from './service';
import { dataTransferValidations } from './validation';

const dataTransferRoute = new Hono<AppHono>();

dataTransferRoute.use(authMiddleware);

dataTransferRoute.post(
  '/export',
  dataTransferValidations.exportData,
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId') as string;

    const dataTransferService = new DataTransferService(c);
    const result = await dataTransferService.exportUserData(body, userId);

    return new Response(result.fileData, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.contentLength.toString(),
      },
    });
  }
);

dataTransferRoute.post(
  '/import',
  dataTransferValidations.importData,
  async (c) => {
    const formData = c.req.valid('form');
    const userId = c.get('userId') as string;

    const dataTransferService = new DataTransferService(c);
    const result = await dataTransferService.importUserData(formData, userId);

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

export default dataTransferRoute;
