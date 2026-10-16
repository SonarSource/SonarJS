import fs from 'node:fs';
import path from 'node:path';

export const isFinalizedReport = report =>
  !!report.exit && Number.isFinite(report.timings?.workerWallMs);

/** Preserve interrupted attempts before opening their log/config paths again. */
export function preserveAttempt(prefix) {
  const directory = path.dirname(prefix);
  const basename = path.basename(prefix);
  const files = fs
    .readdirSync(directory)
    .filter(
      file => file.startsWith(basename + '.') && fs.statSync(path.join(directory, file)).isFile(),
    );
  if (!files.length) return;
  const archive = fs.mkdtempSync(path.join(directory, basename + '.attempt-'));
  for (const file of files) fs.renameSync(path.join(directory, file), path.join(archive, file));
}

/** A crashed/truncated worker must remain a failed sample, without aborting the suite. */
export function readWorkerReport(file, identity) {
  try {
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (
      !report ||
      typeof report.valid !== 'boolean' ||
      !Array.isArray(report.errors) ||
      !report.timings ||
      Object.entries(identity).some(([key, value]) => report[key] !== value) ||
      (report.valid && !Number.isFinite(report.timings.analysisMs))
    )
      throw new Error('Invalid worker report structure or identity');
    return report;
  } catch (error) {
    return {
      ...identity,
      valid: false,
      errors: [{ message: `Unreadable worker report: ${error.message}` }],
      timings: {},
    };
  }
}
