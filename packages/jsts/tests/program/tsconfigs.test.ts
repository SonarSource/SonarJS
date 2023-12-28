import {
  clearTSConfigJsons as clearTSconfigFiles,
  getTSConfigCount,
  loadTSConfigFiles,
} from '@sonar/jsts';
import * as path from 'path';

describe('tsconfigs', () => {
  describe('loadTSConfigFiles', () => {
    beforeAll(() => {
      clearTSconfigFiles();
    });

    const fixturesDir = path.join(__dirname, 'fixtures');
    it('should return the TSconfig files', () => {
      loadTSConfigFiles(fixturesDir, []);
      expect(getTSConfigCount()).toEqual(7);
    });
  });
});
