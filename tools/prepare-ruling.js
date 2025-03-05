import path from 'path';
import fs from 'fs';

const TARGET = path.join(import.meta.dirname, '..', 'its', 'sources');
const LINK = path.join(import.meta.dirname, '..', '..', 'sonarjs-ruling-sources');

if (fs.existsSync(LINK)) {
  fs.unlinkSync(LINK);
}
fs.symlinkSync(TARGET, LINK);
