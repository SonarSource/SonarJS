

export function isPositive(x: number) {
  return x > 0;
}
export type PositiveNumberRecord<T extends string | number | symbol> = Record<T, number> & {
  __type: 'positiveNumberRecord';
};
export const isPositiveNumberRecord = <T extends string | number | symbol>(
  value: Record<T, number> | null | undefined,
): value is PositiveNumberRecord<T> => {
  if (!value) {
    return false;
  }
  const a = Object.values(value)
  const values = (Object.values(value) as number[]);
  console.log(Object.values(value) as number[])
  a.every(isPositive);
  return values.every(isPositive);
};


const foo = 3;
const bar = foo!; // Noncompliant
