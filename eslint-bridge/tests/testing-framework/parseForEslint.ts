import { FileType } from '../../src/analyzer';
import { buildSourceCode } from 'parser';

/**
 * This function is provided as 'parseForESLint' implementation which is used in RuleTester to invoke exactly same logic
 * as we use in our 'parser.ts' module
 */
export function parseForESLint(
  fileContent: string,
  options: { filePath: string },
  fileType: FileType = 'MAIN',
) {
  const { filePath } = options;
  return buildSourceCode(
    { filePath, fileContent, fileType, tsConfigs: [] },
    filePath.endsWith('.ts') ? 'ts' : 'js',
  );
}
