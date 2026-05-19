function toStrings<T>(array: T[]): string[] {
  return array.map((item) => {
      if (item === undefined || item === null || !item.toString) {
          return null;
      } else {
          return item.toString(); // Compliant
      }
  });
}

function maybeString() {
  let foo: string | {};
  foo.toString() // Noncompliant {{'foo' may use Object's default stringification format ('[object Object]') when stringified.}}
}

function guardedByPrototypeComparison(value: object) {
  if (value.toString !== Object.prototype.toString) {
    return value.toString(); // Compliant
  }

  return undefined;
}

function guardedByPrototypeComparisonOnElse(value: object) {
  if (value.toString === Object.prototype.toString) {
    return undefined;
  } else {
    return value.toString(); // Compliant
  }
}

function rejectedDefaultStringResult(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString(); // Compliant
    if (rendered !== '[object Object]') {
      return rendered;
    }
  }

  return data;
}

function rejectedDefaultStringResultOnElse(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString(); // Compliant
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
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}}
  }

  return undefined;
}

function precededByStatementStillUnsafe(value: object) {
  if (value.toString !== Object.prototype.toString) {
    console.log(value);
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}}
  }

  return undefined;
}

function mixedConjunctAlternateStillUnsafe(value: object, other: boolean) {
  if (other && value.toString === Object.prototype.toString) {
    return undefined;
  } else {
    return value.toString(); // Noncompliant {{'value' will use Object's default stringification format ('[object Object]') when stringified.}}
  }
}

declare function next(): object;

function repeatedEvaluationReceiverStillUnsafe() {
  if (next().toString !== Object.prototype.toString) {
    return next().toString(); // Noncompliant {{'next()' will use Object's default stringification format ('[object Object]') when stringified.}}
  }
  return undefined;
}

function booleanResultValidationStillUnsafe(data: object, debug: boolean) {
  const rendered = data.toString(); // Noncompliant {{'data' will use Object's default stringification format ('[object Object]') when stringified.}}
  if (debug || rendered !== '[object Object]') {
    return rendered;
  }
  return data;
}

function laterUnguardedResultUseStillUnsafe(data: object) {
  const rendered = data.toString(); // Noncompliant {{'data' will use Object's default stringification format ('[object Object]') when stringified.}}
  if (rendered !== '[object Object]') {
    return rendered;
  }
  return rendered;
}
