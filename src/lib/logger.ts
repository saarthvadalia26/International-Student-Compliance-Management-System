import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  studentId?: string;
  route?: string;
  service?: string;
  executionTimeMs?: number;
  error?: Error | unknown;
}

/**
 * Enterprise Structured Logger
 * Replaces console.log with structured JSON output and automatically integrates with Sentry.
 */
class Logger {
  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private log(payload: LogPayload) {
    const correlationId = this.generateCorrelationId();
    const timestamp = new Date().toISOString();

    const structuredLog = {
      timestamp,
      correlationId,
      ...payload,
    };

    // 1. Output Structured JSON to stdout for log aggregators (Datadog, Splunk, etc.)
    if (process.env.NODE_ENV !== "test") {
      const output = JSON.stringify(structuredLog);
      switch (payload.level) {
        case "debug":
          console.debug(output);
          break;
        case "info":
          console.info(output);
          break;
        case "warn":
          console.warn(output);
          break;
        case "error":
          console.error(output);
          break;
      }
    }

    // 2. Forward Errors to Sentry
    if (payload.level === "error" || payload.error) {
      Sentry.withScope((scope) => {
        scope.setTag("correlation_id", correlationId);
        if (payload.userId) scope.setUser({ id: payload.userId });
        if (payload.route) scope.setTag("route", payload.route);
        if (payload.service) scope.setTag("service", payload.service);
        if (payload.context) scope.setContext("additional_data", payload.context);
        
        const errorToCapture = payload.error instanceof Error 
          ? payload.error 
          : new Error(payload.message || "Unknown error");
          
        Sentry.captureException(errorToCapture);
      });
    }
  }

  debug(message: string, context?: Omit<LogPayload, "level" | "message">) {
    this.log({ level: "debug", message, ...context });
  }

  info(message: string, context?: Omit<LogPayload, "level" | "message">) {
    this.log({ level: "info", message, ...context });
  }

  warn(message: string, context?: Omit<LogPayload, "level" | "message">) {
    this.log({ level: "warn", message, ...context });
  }

  error(message: string, context?: Omit<LogPayload, "level" | "message">) {
    this.log({ level: "error", message, ...context });
  }
}

export const logger = new Logger();
