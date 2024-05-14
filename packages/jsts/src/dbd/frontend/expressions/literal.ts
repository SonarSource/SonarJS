import { TSESTree } from '@typescript-eslint/utils';
import { Constant, FunctionId, TypeInfo, TypeInfo_Kind } from '../../ir-gen/ir_pb';
import { getLocation } from '../utils';
import { ScopeTranslator } from '../scope-translator';

type NonNullLiteral = string | number | bigint | boolean | RegExp;

export function handleValueWithoutCall(scopeTranslator: ScopeTranslator, value: NonNullLiteral) {
  if (typeof value === 'string' && scopeTranslator.variableMap.has(value)) {
    return scopeTranslator.variableMap.get(value)!;
  }
  const valueId = scopeTranslator.getNewValueId();
  const typeInfo = new TypeInfo({
    kind: TypeInfo_Kind.PRIMITIVE,
    qualifiedName: typeof value,
  });
  const newConstant = new Constant({ value: String(value), valueId, typeInfo });
  scopeTranslator.valueTable.constants.push(newConstant);
  return valueId;
}

export function handleLiteralWithoutCall(
  scopeTranslator: ScopeTranslator,
  literal: TSESTree.Literal,
) {
  const value = literal.value;
  let valueId;
  if (value === null) {
    valueId = 0;
  } else {
    valueId = handleValueWithoutCall(scopeTranslator, value);
  }
  return valueId;
}

export function handleExpressionLiteral(
  scopeTranslator: ScopeTranslator,
  literal: TSESTree.Literal,
  variableName: string | undefined,
) {
  const valueId = handleLiteralWithoutCall(scopeTranslator, literal);
  if (variableName) {
    const functionId = new FunctionId({ simpleName: '#id#', isStandardLibraryFunction: true });
    scopeTranslator.addCallExpression(getLocation(literal), valueId, functionId, [], variableName);
    scopeTranslator.variableMap.set(variableName, valueId);
  }
  return valueId;
}
