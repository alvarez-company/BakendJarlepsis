import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';
import { isDevelopmentNodeEnv, isProductionNodeEnv } from '../common/utils/node-env';

config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jarlepsisdev',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: !isProductionNodeEnv(process.env.NODE_ENV),
  logging: isDevelopmentNodeEnv(process.env.NODE_ENV),
  charset: 'utf8mb4',
  timezone: 'Z',
};

export default databaseConfig;
