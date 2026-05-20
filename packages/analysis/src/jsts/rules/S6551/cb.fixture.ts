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
