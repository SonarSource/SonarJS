// The native production tests exercise the experimental module provider; all
// other tests use the default TS6 provider or install an isolated fake provider.
const entry = process.argv[1]?.replaceAll('\\', '/') ?? '';
process.env.SONARJS_TYPESCRIPT_SOURCE = entry.includes('/lib/') ? '0' : '1';
if (/\/ts7\/native\.test\.(?:ts|js)$/.test(entry)) {
  process.env.SONARJS_TYPESCRIPT_BACKEND = 'ts7';
  const { initializeCompiler } = await import('typescript/control');
  await initializeCompiler();
}
