import 'reflect-metadata';

import { container } from 'tsyringe';
import Main from './main';

container.registerSingleton(Main);
const main = container.resolve(Main);

export default main.app;
