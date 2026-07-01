/**
 * Utilidad de logging con colores para el backend
 * 🔴 Rojo - Errores
 * 🟡 Amarillo - Warnings
 * 🟢 Verde - Éxito
 * 🔵 Azul - Info
 * ⚪ Blanco - Debug
 */

// Códigos ANSI para colores en terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colores de texto
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Fondos
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Emojis para mejor visualización
const icons = {
  error: '🔴',
  warning: '🟡',
  success: '🟢',
  info: '🔵',
  debug: '⚪',
  arrow: '➜',
  check: '✓',
  cross: '✗',
  star: '★',
};

type LogLevel = 'error' | 'warning' | 'success' | 'info' | 'debug';

interface LogOptions {
  module?: string;
  action?: string;
  data?: Record<string, any>;
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-CO', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
}

function formatData(data: Record<string, any>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    parts.push(`${colors.cyan}${key}${colors.reset}=${colors.white}${valueStr}${colors.reset}`);
  }
  return parts.join(' | ');
}

function log(level: LogLevel, message: string, options?: LogOptions): void {
  const timestamp = formatTimestamp();
  let icon: string;
  let color: string;
  let levelLabel: string;

  switch (level) {
    case 'error':
      icon = icons.error;
      color = colors.red;
      levelLabel = 'ERROR';
      break;
    case 'warning':
      icon = icons.warning;
      color = colors.yellow;
      levelLabel = 'WARN';
      break;
    case 'success':
      icon = icons.success;
      color = colors.green;
      levelLabel = 'OK';
      break;
    case 'info':
      icon = icons.info;
      color = colors.blue;
      levelLabel = 'INFO';
      break;
    case 'debug':
    default:
      icon = icons.debug;
      color = colors.gray;
      levelLabel = 'DEBUG';
      break;
  }

  // Construir la línea de log
  let logLine = `${colors.gray}[${timestamp}]${colors.reset} `;
  logLine += `${icon} ${color}${colors.bright}${levelLabel}${colors.reset} `;
  
  if (options?.module) {
    logLine += `${colors.magenta}[${options.module}]${colors.reset} `;
  }
  
  if (options?.action) {
    logLine += `${colors.cyan}${options.action}${colors.reset} ${icons.arrow} `;
  }
  
  logLine += `${color}${message}${colors.reset}`;

  // Log principal
  if (level === 'error') {
    console.error(logLine);
  } else if (level === 'warning') {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }

  // Log de datos adicionales si existen
  if (options?.data && Object.keys(options.data).length > 0) {
    const dataLine = `    ${colors.gray}└─${colors.reset} ${formatData(options.data)}`;
    console.log(dataLine);
  }
}

// Funciones específicas para cada nivel
export const logger = {
  /**
   * 🔴 Log de error - Para errores críticos
   */
  error: (message: string, options?: LogOptions) => log('error', message, options),
  
  /**
   * 🟡 Log de warning - Para advertencias
   */
  warn: (message: string, options?: LogOptions) => log('warning', message, options),
  
  /**
   * 🟢 Log de éxito - Para operaciones completadas correctamente
   */
  success: (message: string, options?: LogOptions) => log('success', message, options),
  
  /**
   * 🔵 Log de info - Para información general
   */
  info: (message: string, options?: LogOptions) => log('info', message, options),
  
  /**
   * ⚪ Log de debug - Para depuración detallada
   */
  debug: (message: string, options?: LogOptions) => log('debug', message, options),

  // Helpers específicos para el módulo de inventario
  inventory: {
    /**
     * Log para movimientos de inventario
     */
    movement: (action: string, data: Record<string, any>, level: LogLevel = 'info') => {
      log(level, action, { module: 'INVENTARIO', action: 'Movimiento', data });
    },
    
    /**
     * Log para asignaciones a técnicos
     */
    assignment: (action: string, data: Record<string, any>, level: LogLevel = 'info') => {
      log(level, action, { module: 'INVENTARIO', action: 'Asignación', data });
    },
    
    /**
     * Log para ajustes de stock
     */
    stock: (action: string, data: Record<string, any>, level: LogLevel = 'info') => {
      log(level, action, { module: 'INVENTARIO', action: 'Stock', data });
    },
  },
};

// Para uso rápido sin opciones
export const logError = (message: string, module?: string) => 
  logger.error(message, { module });

export const logWarn = (message: string, module?: string) => 
  logger.warn(message, { module });

export const logSuccess = (message: string, module?: string) => 
  logger.success(message, { module });

export const logInfo = (message: string, module?: string) => 
  logger.info(message, { module });

export const logDebug = (message: string, module?: string) => 
  logger.debug(message, { module });

export default logger;
