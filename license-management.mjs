/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import licenseChecker from 'license-checker';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path/posix';
import configuration from './packages/typescript/providers.json' with { type: 'json' };

// Configuration
const require = createRequire(import.meta.url);
const MAIN_LICENSE_FILE = path.resolve('LICENSE.txt');
const OUTPUT_DIR = path.resolve('./licenses');
const THIRD_PARTY_LICENSES_DIR = path.resolve('./licenses/THIRD_PARTY_LICENSES');
// Native platform packages carry the same license/notice as their registered SDK.
// Emit that common copy below so regeneration does not depend on the build host.
const platformPackages = new Set(
  Object.values(configuration.providers).flatMap(({ sdk, platforms }) => {
    if (!sdk || !platforms) return [];
    const metadata = require(`${sdk}/package.json`);
    return Object.keys(metadata.optionalDependencies ?? {});
  }),
);

await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(THIRD_PARTY_LICENSES_DIR, { recursive: true });

// Convert callback-based licenseChecker to Promise
const initLicenseChecker = options => {
  return new Promise((resolve, reject) => {
    licenseChecker.init(options, (err, packages) => {
      if (err) {
        reject(err);
      } else {
        resolve(packages);
      }
    });
  });
};

// Copy main license file
async function copyMainLicense() {
  console.log('Copying main license...');
  try {
    await fs.copyFile(MAIN_LICENSE_FILE, path.join(OUTPUT_DIR, 'LICENSE.txt'));
    console.log(`✅ Successfully copied main license to ${OUTPUT_DIR}/LICENSE.txt`);
  } catch (error) {
    console.error(`❌ Failed to copy main license: ${error.message}`);
    throw error;
  }
}

// Download and process dependency licenses
async function downloadLicenses() {
  console.log('Downloading dependency licenses...');
  try {
    const packages = await initLicenseChecker({
      start: process.cwd(),
      production: true,
      excludePrivatePackages: true,
      onlyAllow: null, // Allow all licenses
    });

    // Download and save license files
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const [packageName, info] of Object.entries(packages)) {
      if (platformPackages.has(packageName.substring(0, packageName.lastIndexOf('@')))) continue;
      // Download and save license file
      try {
        if (info.licenseFile) {
          await fs.access(info.licenseFile);
          const packageNameWithoutVersion = packageName.substring(0, packageName.lastIndexOf('@'));
          const safePackageName = packageNameWithoutVersion.replace(/\//g, '-');
          const licenseFileName = `${safePackageName}-LICENSE.txt`;
          const licensePath = path.join(THIRD_PARTY_LICENSES_DIR, licenseFileName);

          // Read the license file
          const licenseContent = await fs.readFile(info.licenseFile, 'utf8');

          // Write to destination
          await fs.writeFile(licensePath, licenseContent);
          console.log(`✅ Saved license for ${packageName}`);
          successCount++;
        } else {
          console.warn(`⚠️ No license file found for ${packageName}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to save license for ${packageName}: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`\nLicense processing complete:`);
    console.log(`- Successfully processed: ${successCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Failed: ${failedCount}`);

    if (failedCount > 0) {
      throw new Error('Some license files failed to process');
    }
  } catch (error) {
    console.error('License check failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('=== Starting license management process ===');

  try {
    await downloadLicenses();
    await copyMainLicense();
    // license-checker can omit aliased compiler SDKs and native notices.
    for (const { sdk } of Object.values(configuration.providers)) {
      if (!sdk) continue;
      const directory = path.dirname(require.resolve(`${sdk}/package.json`));
      for (const filename of ['LICENSE', 'LICENSE.txt', 'NOTICE.txt']) {
        const source = path.join(directory, filename);
        try {
          await fs.access(source);
        } catch {
          continue;
        }
        await fs.copyFile(
          source,
          path.join(
            THIRD_PARTY_LICENSES_DIR,
            sdk === 'typescript-classic' ? 'typescript-LICENSE.txt' : `${sdk}-${filename}`,
          ),
        );
      }
    }
    await fs.copyFile(
      'packages/analysis/src/jsts/frontend/vendor/LICENSE',
      path.join(THIRD_PARTY_LICENSES_DIR, 'typescript-eslint-frontend-LICENSE.txt'),
    );
    await fs.copyFile(
      'packages/typescript/compat/NOTICE.md',
      path.join(THIRD_PARTY_LICENSES_DIR, 'sonarjs-compiler-syntax-NOTICE.txt'),
    );
    console.log('=== License management completed successfully ===');
  } catch (error) {
    console.error('License management failed:', error);
    process.exit(1);
  }
}

// Run the main function
await main();
