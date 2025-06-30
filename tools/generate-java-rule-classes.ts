/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import {
  ESLintConfiguration,
  ESLintConfigurationProperty,
  ESLintConfigurationSQProperty,
} from '../packages/jsts/src/rules/helpers/configs.js';
import assert from 'node:assert';
import {
  getESLintDefaultConfiguration,
  getRspecMeta,
  getRuleMetadata,
  header,
  inflateTemplateToFile,
  JAVA_TEMPLATES_FOLDER,
  listRulesDir,
  sonarKeySorter,
} from './helpers.js';

const JAVA_CHECKS_FOLDER = join(
  'sonar-plugin',
  'javascript-checks',
  'src',
  'main',
  'java',
  'org',
  'sonar',
  'javascript',
  'checks',
);

export async function generateParsingErrorClass() {
  await inflateTemplateToFile(
    join(JAVA_TEMPLATES_FOLDER, 'parsingError.template'),
    join(JAVA_CHECKS_FOLDER, `S2260.java`),
    {
      ___HEADER___: header,
    },
  );
}

async function inflate1541() {
  await inflateTemplateToFile(
    join(JAVA_TEMPLATES_FOLDER, 'S1541.template'),
    join(JAVA_CHECKS_FOLDER, `S1541Ts.java`),
    {
      ___HEADER___: header,
      ___DECORATOR___: 'TypeScriptRule',
      ___CLASS_NAME___: 'S1541Ts',
      ___SQ_PROPERTY_NAME___: 'Threshold',
      ___SQ_PROPERTY_DESCRIPTION___: 'The maximum authorized complexity.',
    },
  );
  await inflateTemplateToFile(
    join(JAVA_TEMPLATES_FOLDER, 'S1541.template'),
    join(JAVA_CHECKS_FOLDER, `S1541Js.java`),
    {
      ___HEADER___: header,
      ___DECORATOR___: 'JavaScriptRule',
      ___CLASS_NAME___: 'S1541Js',
      ___SQ_PROPERTY_NAME___: 'maximumFunctionComplexityThreshold',
      ___SQ_PROPERTY_DESCRIPTION___: 'The maximum authorized complexity in function',
    },
  );
}

export async function generateJavaCheckClass(
  sonarKey: string,
  defaults?: { compatibleLanguages?: ('js' | 'ts')[]; scope?: 'Main' | 'Tests' },
) {
  if (sonarKey === 'S1541') {
    await inflate1541();
    return;
  }
  const ruleRspecMeta = await getRspecMeta(sonarKey, defaults);
  const imports: Set<string> = new Set();
  const decorators = [];
  let javaCheckClass: string;
  if (ruleRspecMeta.scope === 'Tests') {
    javaCheckClass = 'TestFileCheck';
    imports.add('import org.sonar.plugins.javascript.api.TestFileCheck;');
  } else {
    javaCheckClass = 'Check';
    imports.add('import org.sonar.plugins.javascript.api.Check;');
  }

  const derivedLanguages = ruleRspecMeta.compatibleLanguages;
  if (derivedLanguages.includes('js')) {
    decorators.push('@JavaScriptRule');
    imports.add('import org.sonar.plugins.javascript.api.JavaScriptRule;');
  }
  if (derivedLanguages.includes('ts')) {
    decorators.push('@TypeScriptRule');
    imports.add('import org.sonar.plugins.javascript.api.TypeScriptRule;');
  }

  const eslintConfiguration = await getESLintDefaultConfiguration(sonarKey);
  const ruleMetadata = await getRuleMetadata(sonarKey);
  const body = generateBody(eslintConfiguration, ruleMetadata, imports);

  await inflateTemplateToFile(
    join(JAVA_TEMPLATES_FOLDER, 'check.template'),
    join(JAVA_CHECKS_FOLDER, `${sonarKey}.java`),
    {
      ___HEADER___: header,
      ___DECORATORS___: decorators.join('\n'),
      ___RULE_KEY___: sonarKey,
      ___FILE_TYPE_CHECK___: javaCheckClass,
      ___IMPORTS___: [...imports].join('\n'),
      ___BODY___: body.join('\n'),
    },
  );
}

function isSonarSQProperty(
  property: ESLintConfigurationProperty,
): property is ESLintConfigurationSQProperty {
  return (property as ESLintConfigurationSQProperty).description !== undefined;
}

function generateBody(
  config: ESLintConfiguration,
  { blacklistedExtensions }: { blacklistedExtensions?: string[] },
  imports: Set<string>,
) {
  const result = [];
  let hasSQProperties = false;

  function generateRuleProperty(property: ESLintConfigurationProperty) {
    if (!isSonarSQProperty(property)) {
      return;
    }

    const getSQDefault = () => {
      return property.customDefault ?? property.default;
    };

    const getJavaType = () => {
      const defaultValue = getSQDefault();
      switch (typeof defaultValue) {
        case 'number':
          return 'int';
        case 'string':
          return 'String';
        case 'boolean':
          return 'boolean';
        default:
          return 'String';
      }
    };

    const getDefaultValueString = () => {
      const defaultValue = getSQDefault();
      switch (typeof defaultValue) {
        case 'number':
        case 'boolean':
          return `"" + ${defaultValue}`;
        case 'string':
          return `"${defaultValue}"`;
        case 'object': {
          assert(Array.isArray(defaultValue));
          return `"${defaultValue.join(',')}"`;
        }
      }
    };

    const getDefaultValue = () => {
      const defaultValue = getSQDefault();
      switch (typeof defaultValue) {
        case 'number':
        case 'boolean':
          return `${defaultValue.toString()}`;
        case 'string':
          return `"${defaultValue}"`;
        case 'object':
          assert(Array.isArray(defaultValue));
          return `"${defaultValue.join(',')}"`;
      }
    };

    const defaultFieldName = 'field' in property ? (property.field as string) : 'value';
    const defaultValue = getDefaultValueString();
    imports.add('import org.sonar.check.RuleProperty;');
    result.push(
      `@RuleProperty(key="${property.displayName ?? defaultFieldName}", description = "${property.description}", defaultValue = ${defaultValue}, type="${property.fieldType || ''}")`,
    );
    result.push(`${getJavaType()} ${defaultFieldName} = ${getDefaultValue()};`);
    hasSQProperties = true;
    return defaultFieldName;
  }

  const configurations = [];
  config.forEach(config => {
    if (Array.isArray(config)) {
      const fields = config
        .map(namedProperty => {
          const fieldName = generateRuleProperty(namedProperty);
          if (!isSonarSQProperty(namedProperty) || !fieldName) {
            return undefined;
          }
          let value: string;
          if (typeof namedProperty.default === 'object') {
            const castTo = namedProperty.items.type === 'string' ? 'String' : 'Integer';
            imports.add('import java.util.Arrays;');
            value = `Arrays.stream(${fieldName}.split(",")).map(String::trim).toArray(${castTo}[]::new)`;
          } else if (namedProperty.customForConfiguration) {
            value = namedProperty.customForConfiguration;
          } else {
            value = fieldName;
          }
          return { fieldName, value };
        })
        .filter(field => field);
      if (fields.length > 0) {
        imports.add('import java.util.Map;');
        const mapContents = fields.map(({ fieldName, value }) => `"${fieldName}", ${value}`);
        configurations.push(`Map.of(${mapContents})`);
      }
    } else {
      let value = generateRuleProperty(config);
      if (isSonarSQProperty(config) && config.customForConfiguration) {
        value = config.customForConfiguration;
      }
      configurations.push(value);
    }
  });
  if (hasSQProperties) {
    imports.add('import java.util.List;');
    result.push(
      `@Override\npublic List<Object> configurations() {\n return List.of(${configurations.join(',')});\n}\n`,
    );
  }

  if (blacklistedExtensions?.length) {
    imports.add('import java.util.List;');
    result.push(
      `@Override\npublic List<String> blacklistedExtensions(){\nreturn List.of(${blacklistedExtensions.map(ext => `"${ext}"`).join(',')});\n}\n`,
    );
  }
  return result;
}

const allChecks = [];

for (const file of await listRulesDir()) {
  if (file === 'S1541') {
    allChecks.push(`${file}Js`);
    allChecks.push(`${file}Ts`);
  } else {
    allChecks.push(file);
  }

  await generateJavaCheckClass(file);
}

await generateParsingErrorClass();
allChecks.push('S2260');

await inflateTemplateToFile(
  join(JAVA_TEMPLATES_FOLDER, 'allchecks.template'),
  join(JAVA_CHECKS_FOLDER, 'AllChecks.java'),
  {
    ___JAVACHECKS_CLASSES___: allChecks
      .toSorted(sonarKeySorter)
      .map(rule => `${rule}.class`)
      .join(','),
    ___HEADER___: header,
  },
);
