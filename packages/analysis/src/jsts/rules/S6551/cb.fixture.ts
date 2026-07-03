function toStrings<T>(array: T[]): string[] {
  return array.map((item) => {
    if (item?.toString) {
      return item.toString(); // Compliant
    }
    return null;
  });
}

function maybeString() {
  let foo: string | {};
  foo.toString() // Noncompliant {{'foo' may use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
}

function guardedByPrototypeComparison(value: object) {
  if (value.toString !== Object.prototype.toString) {
    return value.toString(); // Compliant // NOSONAR S6551 - intentional compliant fixture assertion.
  }

  return undefined;
}

function guardedByFunctionAndPrototypeComparison(value: object) {
  if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
    const rendered = value.toString(); // Compliant // NOSONAR S6551 - intentional compliant fixture assertion.
    return rendered;
  }

  return undefined;
}

function guardedByFunctionAndPrototypeComparisonReturn(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof value.toString === 'function' &&
    value.toString !== Object.prototype.toString
  ) {
    return value.toString(); // Compliant // NOSONAR S6551 - intentional compliant fixture assertion.
  }

  return undefined;
}

function guardedByPrototypeComparisonOnElse(value: object) {
  if (value.toString === Object.prototype.toString) {
    return undefined;
  } else {
    return value.toString(); // Compliant // NOSONAR S6551 - intentional compliant fixture assertion.
  }
}

function rejectedDefaultStringResult(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString(); // Compliant // NOSONAR S6551 - intentional compliant fixture assertion.
    if (rendered !== '[object Object]') {
      return rendered;
    }
  }

  return data;
}

function rejectedDefaultStringResultOnElse(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString(); // Compliant // NOSONAR S6551 - intentional compliant fixture assertion.
    if (rendered === '[object Object]') {
      return data;
    } else {
      return rendered;
    }
  }

  return data;
}

function precededByMutationStillUnsafe(value: object) {
  if (value.toString !== Object.prototype.toString) {
    value.toString = Object.prototype.toString;
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }

  return undefined;
}

function precededByStatementStillUnsafe(value: object) {
  if (value.toString !== Object.prototype.toString) {
    console.log(value);
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }

  return undefined;
}

function mutates(value: { toString: () => string }) {
  value.toString = Object.prototype.toString;
  return true;
}

function maybeFalseNegative(value: object) {
  if (value.toString !== Object.prototype.toString) {
    return mutates(value as { toString: () => string }) && value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
}

declare function shouldSkipDefaultString(): boolean;
declare function requiresCustomString(): boolean;

function mixedConjunctAlternateStillUnsafe(value: object) {
  if (shouldSkipDefaultString() && value.toString === Object.prototype.toString) {
    return undefined;
  } else {
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
}

function mixedConjunctPositiveStillUnsafe(value: object) {
  if (requiresCustomString() && value.toString !== Object.prototype.toString) {
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
  return undefined;
}

declare function next(): object;

function repeatedEvaluationReceiverStillUnsafe() {
  if (next().toString !== Object.prototype.toString) {
    return next().toString(); // Noncompliant {{'next()' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
  return undefined;
}

function getterBackedReceiverStillUnsafe(holder: { readonly value: object }) {
  if (holder.value.toString !== Object.prototype.toString) {
    return holder.value.toString(); // Noncompliant {{'holder.value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
  return undefined;
}

function booleanResultValidationStillUnsafe(data: object, debug: boolean) {
  const rendered = data.toString(); // Noncompliant {{'data' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  if (debug || rendered !== '[object Object]') {
    return rendered;
  }
  return data;
}

function laterUnguardedResultUseStillUnsafe(data: object, fallback: string) {
  const rendered = data.toString(); // Noncompliant {{'data' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  if (rendered !== '[object Object]') {
    return rendered;
  }
  return rendered || fallback;
}

function guardedByTypeofNotObject(value: unknown): string {
  if (typeof value !== 'object') {
    return `Unexpected value: ${value}`; // Compliant
  }
  return '';
}

function guardedByReversedTypeofNotObject(value: unknown): string {
  if ('object' !== typeof value) {
    return `Unexpected value: ${value}`; // Compliant
  }
  return '';
}

function guardedByPrimitiveTypeofDisjunction(value: unknown): string | undefined {
  if (
    (typeof value === 'string' && value !== '') ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    return 'value=' + value; // Compliant
  }
  return undefined;
}

function guardedByTypeofNotObjectConjunction(value: unknown, label: string): string {
  if (typeof value !== 'object' && value !== null && value !== undefined) {
    return `${label}: ${value}`; // Compliant
  }
  return label;
}

function reassignedAfterTypeofGuardStillUnsafe(value: string | object, replacement: object): string {
  if (typeof value !== 'object') {
    value = replacement;
    return `Unexpected value: ${value}`; // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
  return '';
}

function shadowedAfterTypeofGuardStillUnsafe(value: unknown, replacement: object): string {
  if (typeof value !== 'object') {
    const value = replacement;
    return `Unexpected value: ${value}`; // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
  return '';
}

function truthinessGuardStillUnsafe(pluginName: object, uid: object): string {
  if (pluginName) {
    return `plugins::${pluginName}.${uid}`; // Noncompliant {{'pluginName' will use Object's default stringification format ('[object Object]') when stringified.}} {{'uid' will use Object's default stringification format ('[object Object]') when stringified.}}
  }
  return `application::${uid}`; // Noncompliant {{'uid' will use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
}

function directToStringAfterPrimitiveGuardStillUnsafe(value: unknown): string | undefined {
  if (typeof value !== 'object') {
    return value.toString(); // Noncompliant {{'value' may use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
  }
  return undefined;
}

function loopWriteAfterUseStillUnsafe(value: string | object, replacements: object[]): string {
  let rendered = '';
  if (typeof value !== 'object') {
    for (const replacement of replacements) {
      rendered += `${value}`; // Noncompliant {{'value' may use Object's default stringification format ('[object Object]') when stringified.}} // NOSONAR S6551 - intentional noncompliant fixture case.
      value = replacement;
    }
  }
  return rendered;
}
