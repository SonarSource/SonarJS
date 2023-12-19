import * as fs from 'fs';
import { bundleAssessor } from './bundeAssessor';
import { minificationAssessor } from './minificationAssessor';
import { sizeAssessor } from './sizeAssessor';

export function accept(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return (
    bundleAssessor(filePath, fileContent) &&
    minificationAssessor(filePath, fileContent) &&
    sizeAssessor(fileContent)
  );
}
