import 'reflect-metadata';

import { Hono } from 'hono';
import { inject, injectable } from 'tsyringe';
import { corsMiddleware } from './lib/cors-middleware';
import { errorHandler, notFoundHandler } from './lib/error-handler';
import { requestLogger } from './lib/logger';
import AuthRoute from './modules/auth/route';
import BlockRoute from './modules/block/route';
import DataTransferRoute from './modules/data-transfer/route';
import FieldRoute from './modules/field/route';
import SearchRoute from './modules/search/route';
import SystemRoute from './modules/system/route';
import type { AppHono } from './types';

@injectable()
export default class Main {
  readonly app: Hono<AppHono>;

  constructor(
    @inject(AuthRoute)
    private readonly authRoute: AuthRoute,
    @inject(BlockRoute)
    private readonly blockRoute: BlockRoute,
    @inject(FieldRoute)
    private readonly fieldRoute: FieldRoute,
    @inject(SystemRoute)
    private readonly systemRoute: SystemRoute,
    @inject(SearchRoute)
    private readonly searchRoute: SearchRoute,
    @inject(DataTransferRoute)
    private readonly dataTransferRoute: DataTransferRoute
  ) {
    this.app = new Hono<AppHono>();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddlewares() {
    this.app.use(requestLogger());
    this.app.use('*', corsMiddleware);
  }

  private setupRoutes() {
    const PREFIX = '/api/v1';
    this.app.route(`${PREFIX}/auth`, this.authRoute.route);
    this.app.route(`${PREFIX}/blocks`, this.blockRoute.route);
    this.app.route(`${PREFIX}/fields`, this.fieldRoute.route);
    this.app.route(`${PREFIX}/system`, this.systemRoute.route);
    this.app.route(`${PREFIX}/search`, this.searchRoute.route);
    this.app.route(`${PREFIX}/data-transfer`, this.dataTransferRoute.route);
  }

  private setupErrorHandlers() {
    this.app.onError(errorHandler());
    this.app.notFound(notFoundHandler());
  }
}
