import ts from 'typescript';

export function isKnownGlobalMethod(symbol: ts.Symbol) {
  const parent = (symbol as any).parent;
  if (!parent) {
    return false;
  }
  if (parent.parent) {
    return false;
  }
  const parentSymbol = parent as ts.Symbol;
  if (parentSymbol.escapedName === 'Array' && symbol.escapedName === 'push') {
    return true;
  }
  return false;
}
