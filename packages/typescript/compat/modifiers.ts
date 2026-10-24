import * as ts from 'typescript';

export function getModifiers(node: ts.Node | undefined, includeIllegalModifiers = false) {
  if (!node || (!includeIllegalModifiers && !ts.canHaveModifiers(node))) return undefined;
  const modifiers = ts.getModifiers(node as ts.HasModifiers);
  return modifiers ? [...modifiers] : undefined;
}
