import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Crear directorio de logs solo en desarrollo
let fileTransports: winston.transports.FileTransportInstance[] = [];

if (!isProduction) {
  const logsDir = path.join(process.cwd(), 'logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    // Solo crear File transports si el directorio existe o se pudo crear
    fileTransports = [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ];
  } catch (error) {
    // Si no se puede crear el directorio, solo usar Console
    console.warn('No se pudo crear el directorio de logs, usando solo Console transport:', error);
  }
}

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${context}] ${level}: ${message}`;
        }),
      ),
    }),
    // Solo incluir File transports en desarrollo y si se pudo crear el directorio
    ...fileTransports,
  ],
};
