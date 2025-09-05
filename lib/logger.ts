// Simple logger for server-side error logging
export const logger = {
  error: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, data);
    } else {
      // In production, you might want to send to a logging service
      console.error(`[ERROR] ${message}`, {
        timestamp: new Date().toISOString(),
        ...data,
      });
    }
  },
  
  warn: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, data);
    }
  },
  
  info: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`, data);
    }
  },
};
