import * as path from 'path';
import * as fs from 'fs';
import { FileType } from '../../shared/src';
import { JsTsFiles, ProjectAnalysisInput, analyzeProject } from '../../jsts/src';
import { Minimatch } from 'minimatch';

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
  const exclusionsGlob = stringToGlob(exclusions.split(','));
  getFiles(files, projectPath, exclusionsGlob);
  payload.files = files;
  getFiles(files, projectPath, exclusionsGlob, 'TEST');
  return analyzeProject(payload);

  function stringToGlob(patterns: string[]): Minimatch[] {
    return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
  }
}

function getFiles(acc: JsTsFiles, dir: string, exclusions: Minimatch[], type: FileType = 'MAIN') {
  const files = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  for (const file of files) {
    if (file.isDirectory()) continue;
    if (!isExcluded(file.path, exclusions)) {
      acc[file.path] = { fileType: type };
    }
  }

  function isExcluded(filePath: string, exclusions: Minimatch[]) {
    return exclusions.some(exclusion => exclusion.match(filePath));
  }
}
