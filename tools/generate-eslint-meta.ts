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
import { join } from 'node:path/posix';
import { defaultOptions } from '../packages/analysis/src/jsts/rules/helpers/configs.js';
import { shouldSkipOnGeneratedSource } from '../packages/analysis/src/jsts/rules/helpers/generated-source.js';
import {
  getESLintDefaultConfiguration,
  getRspecMeta,
  header,
  inflateTemplateToFile,
  METADATA_FOLDER,
  RULES_FOLDER,
  TS_TEMPLATES_FOLDER,
  typeMatrix,
} from './helpers.js';
import { readFile } from 'fs/promises';
import ts from 'typescript';

const sonarWayProfile = JSON.parse(
  await readFile(join(METADATA_FOLDER, `Sonar_way_profile.json`), 'utf-8'),
);

/**
 * From the RSPEC json file, creates a generated-meta.ts file with ESLint formatted metadata
 *
 * @param sonarKey rule ID for which we need to create the generated-meta.ts file
 * @param defaults if rspec not found, extra properties to set. Useful for the new-rule script
 */
export async function generateMetaForRule(
  sonarKey: string,
  defaults?: { compatibleLanguages?: ('js' | 'ts')[]; scope?: 'Main' | 'Tests' },
) {
  const ruleRspecMeta = await getRspecMeta(sonarKey, defaults);
  const localMetadataOverrides = await getLocalMetadataOverrides(sonarKey);
  if (!typeMatrix[ruleRspecMeta.type]) {
    console.log(`Type not found for rule ${sonarKey}`);
  }

  const ruleFolder = join(RULES_FOLDER, sonarKey);
  const eslintConfiguration = await getESLintDefaultConfiguration(sonarKey);
  const tags = ruleRspecMeta.tags;

  // Extract ES year from tags like ["es2022", "performance"]
  const ecmaTag = tags.find((t: string) => /^es20\d\d$/i.test(t));
  const requiredEcmaVersion = ecmaTag ? Number.parseInt(ecmaTag.slice(2), 10) : undefined;
  const requiredModuleType = getRequiredModuleType(sonarKey, tags);

  await inflateTemplateToFile(
    join(TS_TEMPLATES_FOLDER, 'generated-meta.template'),
    join(ruleFolder, `generated-meta.ts`),
    {
      ___HEADER___: header,
      ___RULE_TYPE___: typeMatrix[ruleRspecMeta.type],
      ___RULE_KEY___: sonarKey,
      ___DESCRIPTION___: ruleRspecMeta.title.replace(/'/g, "\\'"),
      ___RECOMMENDED___: sonarWayProfile.ruleKeys.includes(sonarKey),
      ___TYPE_CHECKING___: `${tags.includes('type-dependent')}`,
      ___FIXABLE___: ruleRspecMeta.quickfix === 'covered' ? "'code'" : undefined,
      ___DEPRECATED___: `${ruleRspecMeta.status === 'deprecated'}`,
      ___DEFAULT_OPTIONS___: JSON.stringify(defaultOptions(eslintConfiguration), null, 2),
      ___LANGUAGES___: JSON.stringify(ruleRspecMeta.compatibleLanguages),
      ___SCOPE___: ruleRspecMeta.scope,
      ___REQUIRED_DEPENDENCY___: JSON.stringify(
        localMetadataOverrides.requiredDependency ?? ruleRspecMeta.extra?.requiredDependency ?? [],
      ),
      ___SKIP_ON_GENERATED_SOURCE___: `${shouldSkipOnGeneratedSource(tags)}`,
      ___REQUIRED_MODULE_TYPE_EXPORT___:
        requiredModuleType !== undefined
          ? `export const requiredModuleType = '${requiredModuleType}';`
          : '',
      ___REQUIRED_ECMA_VERSION_EXPORT___:
        requiredEcmaVersion !== undefined
          ? `export const requiredEcmaVersion = ${requiredEcmaVersion};`
          : '',
    },
  );
}

function getRequiredModuleType(
  sonarKey: string,
  tags: string[],
): 'module' | 'commonjs' | undefined {
  const esmOnly = tags.includes('esm-only') || tags.includes('esm_only');
  const cjsOnly = tags.includes('cjs-only') || tags.includes('cjs_only');
  if (esmOnly && cjsOnly) {
    throw new Error(`Rule ${sonarKey} cannot have both 'esm-only' and 'cjs-only' tags`);
  }
  if (esmOnly) {
    return 'module';
  }
  if (cjsOnly) {
    return 'commonjs';
  }
  return undefined;
}

type LocalMetadataOverrides = {
  requiredDependency?: string[];
};

async function getLocalMetadataOverrides(sonarKey: string): Promise<LocalMetadataOverrides> {
  const metaPath = join(RULES_FOLDER, sonarKey, 'meta.ts');
  const sourceText = await readFile(metaPath, 'utf8');
  const sourceFile = ts.createSourceFile(metaPath, sourceText, ts.ScriptTarget.Latest, true);

  return {
    requiredDependency: getExportedStringArrayLiteral(sourceFile, 'requiredDependency'),
  };
}

function getExportedStringArrayLiteral(
  sourceFile: ts.SourceFile,
  exportName: string,
): string[] | undefined {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) {
        continue;
      }

      const initializer = unwrapConstAssertion(declaration.initializer);
      if (!initializer || !ts.isArrayLiteralExpression(initializer)) {
        return undefined;
      }

      const values: string[] = [];
      for (const element of initializer.elements) {
        if (!ts.isStringLiteralLike(element)) {
          return undefined;
        }
        values.push(element.text);
      }
      return values;
    }
  }

  return undefined;
}

function unwrapConstAssertion(expression: ts.Expression | undefined): ts.Expression | undefined {
  let current = expression;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isParenthesizedExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}
