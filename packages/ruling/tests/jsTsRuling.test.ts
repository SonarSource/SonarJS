import * as path from 'path';
import * as fs from 'fs';
import { FileType } from '../../shared/src';
import { JsTsFiles, ProjectAnalysisInput, analyzeProject } from '../../jsts/src';

const sourcesPath = path.join(__dirname, '..', '..', '..', 'its', 'sources');
console.log('sourcesPath', sourcesPath);
const jsTsProjectsPath = path.join(sourcesPath, 'jsts', 'projects');
/* const customPath = path.join(sourcesPath, 'jsts', 'custom'); */

describe('Ruling', () => {
  it('should rule', async () => {
    await runRuling();
  });
});

async function runRuling() {
  const projects = getFolders(jsTsProjectsPath);
  for (const project of projects) {
    console.log(`Testing project ${project}`);
    await testProject(project);
    process.exit(0);
  }
}

function getFolders(dir: string) {
  const ignore = new Set(['.github']);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !ignore.has(dirent.name))
    .map(dirent => path.join(dir, dirent.name));
}

function testProject(projectPath: string, exclusions: string = '') {
  const payload: ProjectAnalysisInput = {
    rules: [{ key: 'no-duplicate-in-composite', configurations: [], fileTypeTarget: ['MAIN'] }],
    environments: [],
    globals: [],
    baseDir: projectPath,
    files: {},
  };
  const files = {};
  getFiles(files, projectPath, exclusions);
  payload.files = files;
  getFiles(files, projectPath, exclusions, 'TEST');
  return analyzeProject(payload);
}

function getFiles(acc: JsTsFiles, dir: string, exclusions: string = '', type: FileType = 'MAIN') {
  const regexExclusions = exclusions.split(',').map(exclusion => {
    exclusion = exclusion.trim();
    return new RegExp(exclusion);
  });
  const files = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  for (const file of files) {
    if (file.isDirectory()) continue;
    if (!isExcluded(file.path, regexExclusions)) {
      acc[file.path] = { fileType: type };
    }
  }

  function isExcluded(filePath: string, exclusions: RegExp[]) {
    return exclusions.some(exclusion => filePath.match(exclusion));
  }
}
