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

/**
 * Regenerates the list of React Three Fiber (R3F) intrinsic element names used by rule S6747 to
 * suppress `react/no-unknown-property` false positives (JS-1793).
 *
 * R3F exposes every three.js class as a JSX intrinsic element whose name is the class name with a
 * lowercased first character (e.g. `Mesh` -> `<mesh>`, `AmbientLight` -> `<ambientLight>`). Because
 * these are three.js objects, not DOM elements, `no-unknown-property` has no authority over their
 * props; S6747 therefore suppresses every report on a recognized R3F intrinsic element. This script
 * introspects the actual three.js runtime to derive the recognized element names, so the list never
 * has to be maintained by hand.
 *
 * How it works:
 *   1. installs the latest released `three` into a throwaway directory with plain `npm`
 *      (assumes a working developer npm environment), and
 *   2. keeps every exported class extending `Object3D`, `BufferGeometry` or `Material`, lowercases
 *      the first character, and
 *   3. drops any name that collides with an HTML or SVG tag (e.g. `Audio` -> `audio`, `Line` ->
 *      `line`) so that real DOM elements are never silenced, then
 *   4. writes the sorted result to `react-three-fiber-elements.json`, stamped with the resolved
 *      three.js version.
 *
 * Usage (run from the repository root):
 *   npx tsx tools/generate-S6747-elements.ts                        # latest released three.js
 *   npx tsx tools/generate-S6747-elements.ts --three-version 0.180.0   # pin a specific version
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import prettier from 'prettier';

const OUTPUT_FILE = path.join(
  import.meta.dirname,
  '..',
  'packages',
  'analysis',
  'src',
  'jsts',
  'rules',
  'S6747',
  'false-positives',
  'react-three-fiber-elements.json',
);

// three.js base classes whose subclasses become renderable R3F intrinsic elements.
const R3F_ELEMENT_BASE_CLASSES = ['Object3D', 'BufferGeometry', 'Material'];

// HTML and SVG tag names. Any three.js class whose element name collides with one of these is
// excluded, so a real DOM element (e.g. `<audio>`, `<line>`) is never mistaken for an R3F element.
const HTML_TAGS = new Set(
  `a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption
   cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset
   figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins
   kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option
   output p param picture pre progress q rp rt ruby s samp script section select slot small source
   span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr
   track u ul var video wbr`.split(/\s+/),
);
const SVG_TAGS = new Set(
  `a animate animateMotion animateTransform circle clipPath defs desc ellipse feBlend feColorMatrix
   feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight
   feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode
   feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter
   foreignObject g image line linearGradient marker mask metadata mpath path pattern polygon polyline
   radialGradient rect script set stop style svg switch symbol text textPath title tspan use view`.split(
    /\s+/,
  ),
);

function parseThreeVersion(argv: string[]): string {
  const index = argv.indexOf('--three-version');
  if (index !== -1 && argv[index + 1]) {
    return argv[index + 1];
  }
  return 'latest';
}

function installThree(requestedVersion: string): { dir: string; resolvedVersion: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-s6747-three-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'three-introspect', private: true, type: 'module' }),
  );
  const result = spawnSync(
    'npm',
    [
      'install',
      `three@${requestedVersion}`,
      '--prefer-online',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: dir, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(
      `npm failed to install three@${requestedVersion}. Ensure npm is available and your registry is reachable.`,
    );
  }
  const threePackageJson = JSON.parse(
    fs.readFileSync(path.join(dir, 'node_modules', 'three', 'package.json'), 'utf8'),
  );
  return { dir, resolvedVersion: threePackageJson.version };
}

async function importThree(dir: string): Promise<Record<string, unknown>> {
  const threeDir = path.join(dir, 'node_modules', 'three');
  const threePackageJson = JSON.parse(fs.readFileSync(path.join(threeDir, 'package.json'), 'utf8'));
  const entry = threePackageJson.exports?.['.']?.import ?? threePackageJson.module;
  return import(pathToFileURL(path.join(threeDir, entry)).href);
}

function toElementName(className: string): string {
  return className[0].toLowerCase() + className.slice(1);
}

function extendsAnyBaseClass(ctor: unknown): boolean {
  let current = ctor as { name?: string } | null;
  while (current && current.name) {
    if (R3F_ELEMENT_BASE_CLASSES.includes(current.name)) {
      return true;
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}

function collectElementNames(three: Record<string, unknown>): {
  elements: string[];
  excludedDomCollisions: string[];
} {
  const elements = new Set<string>();
  const excludedDomCollisions = new Set<string>();
  for (const [className, value] of Object.entries(three)) {
    if (typeof value !== 'function' || !('prototype' in value) || !/^[A-Z]/.test(className)) {
      continue;
    }
    if (!extendsAnyBaseClass(value)) {
      continue;
    }
    const elementName = toElementName(className);
    if (HTML_TAGS.has(elementName) || SVG_TAGS.has(elementName)) {
      excludedDomCollisions.add(elementName);
    } else {
      elements.add(elementName);
    }
  }
  return {
    elements: [...elements].sort(),
    excludedDomCollisions: [...excludedDomCollisions].sort(),
  };
}

async function writeElementsFile(
  three: Record<string, unknown>,
  resolvedVersion: string,
): Promise<string[]> {
  const { elements, excludedDomCollisions } = collectElementNames(three);
  const content = {
    _comment:
      'Generated by tools/generate-S6747-elements.ts (npx tsx tools/generate-S6747-elements.ts). Do not edit by hand.',
    threeVersion: resolvedVersion,
    excludedDomCollisions,
    elements,
  };
  // Format with the repository's Prettier config so the generated file stays check-format clean.
  const prettierOptions = await prettier.resolveConfig(OUTPUT_FILE);
  const formatted = await prettier.format(JSON.stringify(content), {
    ...prettierOptions,
    parser: 'json',
  });
  fs.writeFileSync(OUTPUT_FILE, formatted);
  console.log(`Excluded HTML/SVG collisions: ${excludedDomCollisions.join(', ') || '(none)'}`);
  return elements;
}

async function main() {
  const requestedVersion = parseThreeVersion(process.argv.slice(2));
  const previousVersion = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).threeVersion
    : undefined;

  console.log(`Installing three@${requestedVersion}...`);
  const { dir, resolvedVersion } = installThree(requestedVersion);
  try {
    const three = await importThree(dir);
    const elements = await writeElementsFile(three, resolvedVersion);
    console.log(
      `Wrote ${elements.length} React Three Fiber element names from three@${resolvedVersion}` +
        (previousVersion ? ` (previous: three@${previousVersion})` : ''),
    );
    console.log(`Output: ${OUTPUT_FILE}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

await main();
