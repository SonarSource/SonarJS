function assertNever(x: never): never {
  throw new Error(String(x));
}

type State = 'ready';

export function describe(state: State): string {
  switch (state) {
    case 'ready':
      return 'ready';
    default:
      return assertNever(state);
  }
}
