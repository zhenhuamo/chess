// Sentry is optional. Provide no-op wrappers so code compiles without the SDK.
export const isSentryEnabled = () => false;
export const logErrorToSentry = (
  error: unknown,
  _context?: Record<string, unknown>
) => {
  // eslint-disable-next-line no-console
  console.error(error);
};
