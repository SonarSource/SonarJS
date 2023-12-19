import { bundleAssessor } from './bundeAssessor';
import { minificationAssessor } from './minificationAssessor';
import { sizeAssessor } from './sizeAssessor';

export function accept(filePath: string, fileContent: string) {
  return (
    bundleAssessor(filePath, fileContent) &&
    minificationAssessor(filePath, fileContent) &&
    sizeAssessor(fileContent)
  );
}
