/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
  writePrettyFile,
} from './helpers.js';
import {
  cssRulesMeta,
  type CssRuleMeta,
  type StylelintListParam,
} from '../packages/css/src/rules/metadata.js';

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
  } else {
    javaCheckClass = 'MainFileCheck';
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

// ===== CSS rule class generation =====

const CSS_JAVA_CHECKS_FOLDER = join(
  'sonar-plugin',
  'css',
  'src',
  'main',
  'java',
  'org',
  'sonar',
  'css',
  'rules',
);
const CSS_JAVA_FOLDER = join('sonar-plugin', 'css', 'src', 'main', 'java', 'org', 'sonar', 'css');
const CSS_JAVA_TEST_FOLDER = join(
  'sonar-plugin',
  'css',
  'src',
  'test',
  'java',
  'org',
  'sonar',
  'css',
  'rules',
);

function escapeJavaString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function generateCssBody(rule: CssRuleMeta, imports: Set<string>): string {
  const { listParam, booleanParam } = rule;

  if (!listParam?.length && !booleanParam) {
    return '';
  }

  const lines: string[] = [];

  if (listParam?.length) {
    imports.add('import static org.sonar.css.rules.RuleUtils.splitAndTrim;');
    imports.add('import java.util.Arrays;');
    imports.add('import java.util.List;');
    imports.add('import org.sonar.check.RuleProperty;');

    for (const param of listParam) {
      const hasDefault = param.default.trim() !== '';
      const constName = `DEFAULT_${param.javaField.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
      if (hasDefault) {
        lines.push(
          `private static final String ${constName} = "${escapeJavaString(param.default)}";`,
        );
        lines.push('');
      }
      lines.push(`@RuleProperty(`);
      lines.push(`  key = "${param.sqKey}",`);
      lines.push(`  description = "${escapeJavaString(param.description)}",`);
      lines.push(`  defaultValue = ${hasDefault ? '"" + ' + constName : '""'}`);
      lines.push(`)`);
      lines.push(`String ${param.javaField} = ${hasDefault ? constName : '""'};`);
      lines.push('');
    }

    lines.push('@Override');
    lines.push('public List<Object> stylelintOptions() {');
    const args = listParam.map(p => `splitAndTrim(${p.javaField})`).join(', ');
    lines.push(`  return Arrays.asList(true, new StylelintIgnoreOption(${args}));`);
    lines.push('}');
    lines.push('');

    lines.push('private static class StylelintIgnoreOption {');
    lines.push('');
    for (const param of listParam) {
      lines.push(`  // Used by GSON serialization`);
      lines.push(`  private final List<String> ${param.stylelintOptionKey};`);
    }
    lines.push('');
    const ctorArgs = listParam.map(p => `List<String> ${p.stylelintOptionKey}`).join(', ');
    lines.push(`  StylelintIgnoreOption(${ctorArgs}) {`);
    for (const param of listParam) {
      lines.push(`    this.${param.stylelintOptionKey} = ${param.stylelintOptionKey};`);
    }
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }

  if (booleanParam) {
    imports.add('import java.util.Arrays;');
    imports.add('import java.util.Collections;');
    imports.add('import java.util.List;');
    imports.add('import org.sonar.check.RuleProperty;');

    const { sqKey, javaField, description, default: defaultVal, onTrue } = booleanParam;
    const constName = `DEFAULT_${javaField.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    lines.push(`private static final boolean ${constName} = ${defaultVal};`);
    lines.push('');
    lines.push(`@RuleProperty(`);
    lines.push(`  key = "${sqKey}",`);
    lines.push(`  description = "${escapeJavaString(description)}",`);
    lines.push(`  defaultValue = "" + ${constName}`);
    lines.push(`)`);
    lines.push(`boolean ${javaField} = ${constName};`);
    lines.push('');
    lines.push('@Override');
    lines.push('public List<Object> stylelintOptions() {');
    lines.push(`  return ${javaField}`);
    lines.push(`    ? Arrays.asList(true, new StylelintIgnoreOption())`);
    lines.push(`    : Collections.emptyList();`);
    lines.push('}');
    lines.push('');

    lines.push('private static class StylelintIgnoreOption {');
    for (const opt of onTrue) {
      const valuesStr = opt.values.map(v => `"${escapeJavaString(v)}"`).join(', ');
      lines.push(
        `  private final List<String> ${opt.stylelintOptionKey} = Collections.singletonList(${valuesStr});`,
      );
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

async function generateCssJavaCheckClass(rule: CssRuleMeta): Promise<void> {
  const imports = new Set<string>();
  const body = generateCssBody(rule, imports);

  await inflateTemplateToFile(
    join(JAVA_TEMPLATES_FOLDER, 'css-check.template'),
    join(CSS_JAVA_CHECKS_FOLDER, `${rule.sqKey}.java`),
    {
      ___HEADER___: header,
      ___IMPORTS___: [...imports].sort().join('\n'),
      ___RULE_KEY___: rule.sqKey,
      ___CLASS_NAME___: rule.sqKey,
      ___STYLELINT_KEY___: rule.stylelintKey,
      ___BODY___: body,
    },
  );
}

function generateCssRuleTestBody(rules: typeof cssRulesMeta): {
  perRuleTests: string;
  rulesWithOptionsClasses: string;
  propertiesCount: number;
} {
  const rulesWithOptions = rules.filter(r => r.listParam?.length || r.booleanParam);
  const sortedRulesWithOptions = rulesWithOptions.toSorted((a, b) =>
    sonarKeySorter(a.sqKey, b.sqKey),
  );

  const rulesWithOptionsClasses = sortedRulesWithOptions
    .map(r => `${r.sqKey}.class`)
    .join(',\n      ');

  let propertiesCount = 0;
  for (const rule of rules) {
    propertiesCount += rule.listParam?.length ?? 0;
    if (rule.booleanParam) propertiesCount += 1;
  }

  const testMethods: string[] = [];

  for (const rule of sortedRulesWithOptions) {
    const methodPrefix = rule.sqKey.toLowerCase(); // e.g. 's4662'

    if (rule.listParam?.length) {
      const params = rule.listParam;

      // Default test
      const defaultOptionObj: Record<string, string[]> = {};
      for (const p of params) {
        defaultOptionObj[p.stylelintOptionKey] =
          p.default.trim() === '' ? [] : p.default.split(',').map(v => v.trim());
      }
      const defaultJson = JSON.stringify([true, defaultOptionObj]).replace(/"/g, '\\"');

      testMethods.push(`  @Test`);
      testMethods.push(`  void ${methodPrefix}_default() {`);
      testMethods.push(
        `    String optionsAsJson = GSON.toJson(new ${rule.sqKey}().stylelintOptions());`,
      );
      testMethods.push(`    assertThat(optionsAsJson).isEqualTo("${defaultJson}");`);
      testMethods.push(`  }`);
      testMethods.push('');

      // Custom test
      const customOptionObj: Record<string, string[]> = {};
      for (const p of params) {
        customOptionObj[p.stylelintOptionKey] = ['testValue1', 'testValue2'];
      }
      const customJson = JSON.stringify([true, customOptionObj]).replace(/"/g, '\\"');

      testMethods.push(`  @Test`);
      testMethods.push(`  void ${methodPrefix}_custom() {`);
      testMethods.push(`    ${rule.sqKey} instance = new ${rule.sqKey}();`);
      for (const p of params) {
        testMethods.push(`    instance.${p.javaField} = "testValue1, testValue2";`);
      }
      testMethods.push(`    String optionsAsJson = GSON.toJson(instance.stylelintOptions());`);
      testMethods.push(`    assertThat(optionsAsJson).isEqualTo("${customJson}");`);
      testMethods.push(`  }`);
      testMethods.push('');
    }

    if (rule.booleanParam) {
      const bp = rule.booleanParam;

      // When true (default)
      const trueOptionObj: Record<string, string[]> = {};
      for (const opt of bp.onTrue) {
        trueOptionObj[opt.stylelintOptionKey] = opt.values;
      }
      const trueJson = JSON.stringify([true, trueOptionObj]).replace(/"/g, '\\"');

      testMethods.push(`  @Test`);
      testMethods.push(`  void ${methodPrefix}_default() {`);
      testMethods.push(
        `    String optionsAsJson = GSON.toJson(new ${rule.sqKey}().stylelintOptions());`,
      );
      testMethods.push(`    assertThat(optionsAsJson).isEqualTo("${trueJson}");`);
      testMethods.push(`  }`);
      testMethods.push('');

      // When false
      testMethods.push(`  @Test`);
      testMethods.push(`  void ${methodPrefix}_disabled() {`);
      testMethods.push(`    ${rule.sqKey} instance = new ${rule.sqKey}();`);
      testMethods.push(`    instance.${bp.javaField} = false;`);
      testMethods.push(`    assertThat(instance.stylelintOptions()).isEmpty();`);
      testMethods.push(`  }`);
      testMethods.push('');
    }
  }

  return { perRuleTests: testMethods.join('\n'), rulesWithOptionsClasses, propertiesCount };
}

for (const cssRule of cssRulesMeta) {
  await generateCssJavaCheckClass(cssRule);
}

// Generate CssRules.java
const sortedCssRules = cssRulesMeta.toSorted((a, b) => sonarKeySorter(a.sqKey, b.sqKey));

const cssRuleImports = sortedCssRules.map(r => `import org.sonar.css.rules.${r.sqKey};`).join('\n');

const cssRuleClasses = sortedCssRules.map(r => `${r.sqKey}.class`).join(',\n        ');

await inflateTemplateToFile(
  join(JAVA_TEMPLATES_FOLDER, 'css-rules.template'),
  join(CSS_JAVA_FOLDER, 'CssRules.java'),
  {
    ___HEADER___: header,
    ___IMPORTS___: cssRuleImports,
    ___RULE_CLASSES___: cssRuleClasses,
  },
);

// Generate CssRuleTest.java
const { perRuleTests, rulesWithOptionsClasses, propertiesCount } =
  generateCssRuleTestBody(cssRulesMeta);

await inflateTemplateToFile(
  join(JAVA_TEMPLATES_FOLDER, 'css-rule-test.template'),
  join(CSS_JAVA_TEST_FOLDER, 'CssRuleTest.java'),
  {
    ___HEADER___: header,
    ___RULES_WITH_OPTIONS_CLASSES___: rulesWithOptionsClasses,
    ___RULES_PROPERTIES_COUNT___: String(propertiesCount),
    ___PER_RULE_TESTS___: perRuleTests,
  },
);
