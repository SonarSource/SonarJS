import {
  clearTSConfigs as clearTSconfigFiles,
  getTSConfigsCount,
  loadTSConfigs,
} from '@sonar/jsts';
import * as path from 'path';

describe('tsconfigs', () => {
  describe('loadTSConfigFiles', () => {
    beforeAll(() => {
      clearTSconfigFiles();
    });

    const fixturesDir = path.join(__dirname, 'fixtures');
    it('should return the TSconfig files', () => {
      loadTSConfigs(fixturesDir, []);
      expect(getTSConfigsCount()).toEqual(7);
    });
  });
});
