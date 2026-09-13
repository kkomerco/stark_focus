export function reportLovableError(error: unknown, context?: Record<string, any>) {
  console.error("[ErrorReporting]", error, context);
}
