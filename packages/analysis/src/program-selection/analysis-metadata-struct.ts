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
 * Conversion helpers between plain JavaScript values and the protobuf `Struct`/`Value`
 * representation used by the program selection analysis metadata archive.
 */

export function readContextConfiguration(
  contextMetadata?: string,
): ({ baseDir: string } & Record<string, unknown>) | undefined {
  if (!contextMetadata) {
    return undefined;
  }
  const context = JSON.parse(contextMetadata);
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new Error('Invalid SonarJS collector context metadata');
  }
  // Empty legacy metadata is unsupported. SQAA owns analyzer-version compatibility.
  if (Object.keys(context).length === 0) {
    return undefined;
  }
  const configuration = context.configuration;
  if (
    !configuration ||
    typeof configuration !== 'object' ||
    Array.isArray(configuration) ||
    typeof configuration.baseDir !== 'string' ||
    !configuration.baseDir
  ) {
    throw new Error('Invalid SonarJS collector context metadata');
  }
  return configuration;
}

export function structFromObject(value: object): { fields: Record<string, unknown> } {
  return {
    fields: Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        const converted = valueFromUnknown(item);
        return converted === undefined ? [] : [[key, converted]];
      }),
    ),
  };
}

function valueFromUnknown(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (value === null) {
    return { nullValue: 0 };
  }
  if (typeof value === 'boolean') {
    return { boolValue: value };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Cannot serialize non-finite compiler option value ${value}`);
    }
    return { numberValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      listValue: { values: value.map(valueFromUnknown).filter(item => item !== undefined) },
    };
  }
  if (typeof value === 'object') {
    return { structValue: structFromObject(value) };
  }
  return undefined;
}

export function objectFromStruct(struct: {
  fields?: Record<string, unknown> | null;
}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(struct.fields ?? {}).map(([key, value]) => [key, unknownFromValue(value)]),
  );
}

function unknownFromValue(value: unknown): unknown {
  const typed = value as {
    nullValue?: number | null;
    boolValue?: boolean | null;
    numberValue?: number | null;
    stringValue?: string | null;
    listValue?: { values?: unknown[] | null } | null;
    structValue?: { fields?: Record<string, unknown> | null } | null;
  };
  if (typed.nullValue != null) {
    return null;
  }
  if (typed.boolValue != null) {
    return typed.boolValue;
  }
  if (typed.numberValue != null) {
    return typed.numberValue;
  }
  if (typed.stringValue != null) {
    return typed.stringValue;
  }
  if (typed.listValue != null) {
    return (typed.listValue.values ?? []).map(unknownFromValue);
  }
  if (typed.structValue != null) {
    return objectFromStruct(typed.structValue);
  }
  throw new Error('Invalid compiler option value in program selection archive');
}
