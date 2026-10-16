import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

/** End-of-analysis RSS sample; this is not the compiler's peak RSS. */
export function sampleNativeMemory() {
  const pids = [...(globalThis[Symbol.for('sonarjs.ts7.processes')]?.keys() ?? [])];
  if (!pids.length) return { available: true, pids, rssBytes: 0 };
  if (process.platform === 'win32') {
    const command = `$total = 0; foreach ($id in @(${pids.join(',')})) { $total += (Get-Process -Id $id -ErrorAction Stop).WorkingSet64 }; Write-Output $total`;
    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', command],
      {
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    if (result.status !== 0) return { available: false, pids, error: result.stderr.trim() };
    return { available: true, pids, rssBytes: Number(result.stdout.trim()) };
  }
  if (process.platform === 'linux') {
    const rssBytes = pids.reduce((sum, pid) => {
      const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
      return sum + Number(status.match(/^VmRSS:\s+(\d+)/m)[1]) * 1024;
    }, 0);
    return { available: true, pids, rssBytes };
  }
  return {
    available: false,
    pids,
    error: 'Native RSS sampling is implemented for Windows and Linux only',
  };
}
