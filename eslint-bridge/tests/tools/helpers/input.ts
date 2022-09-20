import { FileType, readFile } from 'helpers';
import { JsTsAnalysisInput, YamlAnalysisInput } from 'services/analysis';

export async function jsTsInput({
  filePath = '',
  fileContent = undefined,
  fileType = 'MAIN' as FileType,
  tsConfigs = [],
  programId = undefined,
  linterId = 'default',
}): Promise<JsTsAnalysisInput> {
  return programId
    ? {
        filePath,
        fileContent: fileContent || (await readFile(filePath)),
        fileType,
        programId,
        linterId,
      }
    : {
        filePath,
        fileContent: fileContent || (await readFile(filePath)),
        fileType,
        tsConfigs,
        linterId,
      };
}

export async function yamlInput({
  filePath = '',
  fileContent = undefined,
  linterId = 'default',
}): Promise<YamlAnalysisInput> {
  return { filePath, fileContent: fileContent || (await readFile(filePath)), linterId };
}
