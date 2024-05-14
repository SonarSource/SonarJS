import { TSESTree } from '@typescript-eslint/utils';
import { Constant, FunctionId, TypeInfo, TypeInfo_Kind } from '../../ir-gen/ir_pb';
import { getLocation } from '../utils';
import { ScopeTranslator } from '../scope-translator';
import { handleExpression } from './index';

export function handleObjectExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.ObjectExpression,
  variableName: string | undefined,
) {
  const objectValueId = scopeTranslator.getNewValueId();
  const typeInfo = new TypeInfo({
    kind: TypeInfo_Kind.CLASS,
    qualifiedName: 'object',
  });
  const newConstant = new Constant({ valueId: objectValueId, typeInfo });
  scopeTranslator.valueTable.constants.push(newConstant);
  scopeTranslator.addCallExpression(
    getLocation(expression),
    objectValueId,
    new FunctionId({ simpleName: '#new-object#', isStandardLibraryFunction: true }),
    [],
    variableName,
  );
  expression.properties.forEach(prop => {
    if (
      prop.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
      prop.value.type === TSESTree.AST_NODE_TYPES.AssignmentPattern
    ) {
      throw new Error('Unsupported object expression parsing');
    }
    if (prop.value.type === 'TSEmptyBodyFunctionExpression') {
      return;
    }
    const keyId = handleExpression(scopeTranslator, prop.key);
    const valueId = handleExpression(scopeTranslator, prop.value);
    const resultValueId = scopeTranslator.getNewValueId();
    scopeTranslator.addCallExpression(
      getLocation(prop),
      resultValueId,
      new FunctionId({ simpleName: '#map-set#', isStandardLibraryFunction: true }),
      [objectValueId, keyId, valueId],
    );
  });
  if (variableName) {
    scopeTranslator.variableMap.set(variableName, objectValueId);
  }
  return objectValueId;
}
