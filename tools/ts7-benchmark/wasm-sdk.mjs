import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

/** Assemble the SDK and its matching standard libraries, including npm's split layout. */
export async function copyWasmSdk(sdk, destination, revision) {
  const metadata = JSON.parse(fs.readFileSync(path.join(sdk, 'package.json'), 'utf8'));
  if (metadata.gitHead !== revision) throw new Error('JS SDK must match the WASM source revision');
  let libraryDirectory = path.join(sdk, 'lib');
  if (!fs.existsSync(path.join(libraryDirectory, 'lib.d.ts'))) {
    const { default: getExePath } = await import(
      pathToFileURL(path.join(libraryDirectory, 'getExePath.js')).href
    );
    libraryDirectory = path.dirname(getExePath());
    const platform = JSON.parse(
      fs.readFileSync(path.join(libraryDirectory, '../package.json'), 'utf8'),
    );
    if (platform.gitHead !== revision || platform.version !== metadata.version)
      throw new Error('Compiler standard libraries must match the WASM source revision and SDK');
  }
  if (!fs.existsSync(path.join(libraryDirectory, 'lib.d.ts')))
    throw new Error(`Missing compiler standard libraries in ${libraryDirectory}`);
  const libraries = fs
    .readdirSync(libraryDirectory)
    .filter(name => /^lib(?:\..+)?\.d\.ts$/.test(name))
    .sort();
  // The destination is generated output. Remove old declarations so a rebuild
  // cannot silently retain libraries from a different compiler revision.
  fs.cpSync(sdk, destination, { recursive: true });
  const target = path.join(destination, 'lib');
  for (const name of fs.readdirSync(target))
    if (/^lib(?:\..+)?\.d\.ts$/.test(name)) fs.unlinkSync(path.join(target, name));
  const hashes = {};
  for (const name of libraries) {
    const content = fs.readFileSync(path.join(libraryDirectory, name));
    fs.writeFileSync(path.join(target, name), content);
    hashes[name] = createHash('sha256').update(content).digest('hex');
  }
  return { source: sdk, version: metadata.version, revision, libraryDirectory, libraries: hashes };
}
