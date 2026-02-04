/**
 * Comprehensive Logging Module for Perfect Fit Frontend
 * 
 * Provides structured, colored logging for different components:
 * - apiLogger: HTTP requests and responses
 * - errorLogger: Exceptions and errors
 * - uiLogger: Component lifecycle and UI events
 * 
 * Configuration:
 * - Development mode: Full colored output with emojis
 * - Production mode: Only errors are logged
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Check environment
const isDevelopment = process.env.NODE_ENV === 'development'

// Log level configuration (can be overridden by env)
const LOG_LEVEL: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info'

// Level priority for filtering
const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
}

// Colors for console output
const LEVEL_COLORS: Record<LogLevel, string> = {
    debug: 'color: #6B7280', // gray
    info: 'color: #10B981',  // green
    warn: 'color: #F59E0B',  // yellow
    error: 'color: #EF4444', // red
}

// Emojis for visual clarity
const LEVEL_EMOJIS: Record<LogLevel, string> = {
    debug: '🔍',
    info: '✅',
    warn: '⚠️',
    error: '❌',
}

// Logger name emojis
const LOGGER_EMOJIS: Record<string, string> = {
    API: '🌐',
    ERROR: '💥',
    UI: '🎨',
    AUTH: '🔐',
}

/**
 * Format timestamp for log output
 */
function getTimestamp(): string {
    return new Date().toISOString().slice(11, 23)
}

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
    // In production, only log errors
    if (!isDevelopment && level !== 'error') {
        return false
    }
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL]
}

/**
 * Core logging function
 */
function log(level: LogLevel, loggerName: string, message: string, data?: unknown): void {
    if (!shouldLog(level)) return

    const timestamp = getTimestamp()
    const loggerEmoji = LOGGER_EMOJIS[loggerName] || '📋'
    const levelEmoji = LEVEL_EMOJIS[level]
    const color = LEVEL_COLORS[level]

    // Format: [HH:MM:SS.mmm] 🌐 ✅ [API] Message
    const prefix = `[${timestamp}] ${loggerEmoji} ${levelEmoji} [${loggerName}]`

    if (isDevelopment) {
        // Colored output in development
        if (data !== undefined) {
            console[level](`%c${prefix} ${message}`, color, data)
        } else {
            console[level](`%c${prefix} ${message}`, color)
        }
    } else {
        // Plain output in production (for error tracking services)
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            logger: loggerName,
            message,
            ...(data !== undefined && { data }),
        }
        console[level](JSON.stringify(logData))
    }
}

/**
 * Create a logger instance for a specific component
 */
function createLogger(name: string) {
    return {
        debug: (msg: string, data?: unknown) => log('debug', name, msg, data),
        info: (msg: string, data?: unknown) => log('info', name, msg, data),
        warn: (msg: string, data?: unknown) => log('warn', name, msg, data),
        error: (msg: string, data?: unknown) => log('error', name, msg, data),
    }
}

// Pre-configured loggers
export const apiLogger = createLogger('API')
export const errorLogger = createLogger('ERROR')
export const uiLogger = createLogger('UI')
export const authLogger = createLogger('AUTH')

// Utility functions for common logging patterns

/**
 * Log an API request
 */
export function logApiRequest(method: string, url: string, body?: unknown): void {
    apiLogger.info(`→ ${method} ${url}`, body ? { body } : undefined)
}

/**
 * Log an API response
 */
export function logApiResponse(method: string, url: string, status: number, durationMs: number): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    log(level, 'API', `← ${method} ${url} [${status}] (${durationMs.toFixed(2)}ms)`)
}

/**
 * Log an API error
 */
export function logApiError(method: string, url: string, error: Error | string, details?: unknown): void {
    const errorMessage = error instanceof Error ? error.message : error
    apiLogger.error(`✗ ${method} ${url}: ${errorMessage}`, details)
}

/**
 * Log a UI event
 */
export function logUIEvent(component: string, event: string, data?: unknown): void {
    uiLogger.debug(`[${component}] ${event}`, data)
}

/**
 * Log an error with stack trace
 */
export function logError(error: Error, context?: string): void {
    const contextStr = context ? `[${context}] ` : ''
    errorLogger.error(`${contextStr}${error.name}: ${error.message}`, {
        stack: error.stack,
    })
}

// Export types for TypeScript
export type { LogLevel }
