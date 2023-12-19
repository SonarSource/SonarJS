const READ_CHARACTERS_LIMIT = 2048;
const COMMENT_OPERATOR_FUNCTION = buildBundleRegex();

export function bundleAssessor(filename: string, input: string) {
  filename;
  const firstCharacters = input.substring(0, READ_CHARACTERS_LIMIT);
  return !COMMENT_OPERATOR_FUNCTION.test(firstCharacters);
}

function buildBundleRegex() {
  const COMMENT = '/\\*.*\\*/';
  const OPERATOR = '[!;+(]';
  const OPTIONAL_FUNCTION_NAME = '(?: [_$a-zA-Z][_$a-zA-Z0-9]*)?';

  return new RegExp(
    COMMENT + '\\s*' + OPERATOR + 'function ?' + OPTIONAL_FUNCTION_NAME + '\\(',
    's',
  );
}
