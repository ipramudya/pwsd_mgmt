import 'reflect-metadata';

import { container } from 'tsyringe';
import Main from './main';

const main = container.resolve(Main);

export default main.app;
