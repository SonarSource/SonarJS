import { spawnSync } from 'child_process';

describe('eslint-plugin-sonarjs integration tests', () => {
  it('should work', async () => {
    const result = spawnSync('./test.sh', {
      cwd: __dirname,
      encoding: 'utf-8',
    });
    const output = result.stdout;
    const errorLines = output.split('\n').filter(line => line.includes('error'));
    expect(errorLines.length).toBeGreaterThan(10);
  });
});
