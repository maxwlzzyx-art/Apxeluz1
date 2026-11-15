export function resolveServerPort(
  cliArgs: string[],
  env: Record<string, string | undefined>
): number {
  const portArgIdx = cliArgs.indexOf('--port');
  if (portArgIdx !== -1 && cliArgs[portArgIdx + 1]) {
    const parsedArg = parseInt(cliArgs[portArgIdx + 1], 10);
    if (Number.isInteger(parsedArg) && parsedArg > 0) {
      return parsedArg;
    }
  }

  if (env.DEFAULT_APP_PORT) {
    const parsedDefault = parseInt(env.DEFAULT_APP_PORT, 10);
    if (Number.isInteger(parsedDefault) && parsedDefault > 0) {
      return parsedDefault;
    }
  }

  if (env.PORT) {
    const parsedPort = parseInt(env.PORT, 10);
    const parsedNginx = env.NGINX_PORT ? parseInt(env.NGINX_PORT, 10) : NaN;
    if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort !== parsedNginx) {
      return parsedPort;
    }
  }

  return 3000;
}

export function decodeJwtPayload(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr =
      typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64').toString('utf8')
        : atob(padded);
    const parsed = JSON.parse(jsonStr);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
