/**
 * Dev-only logger. Compiles to a no-op in production builds.
 */

export const log: (...args: unknown[]) => void = import.meta.env.DEV
  ? console.log.bind(console)
  : () => {};
