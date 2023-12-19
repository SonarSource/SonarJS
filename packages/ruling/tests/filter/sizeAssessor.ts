const DEFAULT_MAX_FILE_SIZE_KB = 1024;

export function sizeAssessor(input: string, maxSize: number = DEFAULT_MAX_FILE_SIZE_KB) {
  return getBytes(input) <= maxSize * 1024;

  function getBytes(input: string) {
    return Buffer.byteLength(input, 'utf8');
  }
}
