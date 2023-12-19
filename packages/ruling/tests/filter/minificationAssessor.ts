const DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD = 200;

export function minificationAssessor(filename: string, input: string) {
  return !(
    hasMinifiedFilename(filename) ||
    (isMinifiableFilename(filename) && hasExcessiveAverageLineLength(input))
  );
}

function isMinifiableFilename(filename: string) {
  return filename.endsWith('.js') || filename.endsWith('.css');
}

function hasMinifiedFilename(filename: string) {
  return (
    filename.endsWith('.min.js') ||
    filename.endsWith('-min.js') ||
    filename.endsWith('.min.css') ||
    filename.endsWith('-min.css')
  );
}

function hasExcessiveAverageLineLength(
  input: string,
  size: number = DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD,
) {
  return getAverageLineLength(input) > size;
}

function getAverageLineLength(input: string) {
  const lines = input.split('\n');
  const totalLength = lines.reduce((acc, line) => acc + line.length, 0);
  return totalLength / lines.length;
}
