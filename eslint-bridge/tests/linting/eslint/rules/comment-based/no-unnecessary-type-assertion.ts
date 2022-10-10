/**
 * taken from https://github.com/SonarSource/SonarJS/issues/3235
 * We keep this test case to track when typescript-eslint fixes it
 */
export function isPositive(x: number) {
  return x > 0;
}

export type PositiveNumberRecord<T extends string | number | symbol> =
  Record<T, number> & { __type: 'positiveNumberRecord' };

export const isPositiveNumberRecord = <T extends string | number | symbol>
  (value: Record<T, number> | null | undefined): value is PositiveNumberRecord<T> => {

    if (!value) {
      return false;
    }

    /**
     * This is a FP, remove "Noncompliant" when typescript-eslint fixes this
     */
    const values = Object.values(value) as number[]; // Noncompliant [[qf1]] {{This assertion is unnecessary since it does not change the type of the expression.}}
    // fix@qf1 {{yolo}}
    // edit@qf1 {{    const values = Object.values(value);}}

    return values.every(isPositive);
};
