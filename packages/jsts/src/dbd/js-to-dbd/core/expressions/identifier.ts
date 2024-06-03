import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createGetFieldFunctionDefinition,
  createIdentityFunctionDefinition,
} from '../function-definition';
import { createReference, createReference2 } from '../values/reference';
import { createNull } from '../values/constant';
import {
  type EnvironmentRecord,
  getIdentifierReference,
  isAnEnvironmentRecord,
} from '../ecma/environment-record';
import { getValue, isUnresolvableReference, unresolvable } from '../ecma/reference-record';
import { type BaseValue } from '../value';
import { getParameter } from '../utils';
import { isAParameter } from '../values/parameter';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (node, record, context) => {
  let value: BaseValue<any>;

  if (record === unresolvable) {
    throw new Error('CHECK WHY IT HAPPENS');
  }

  if (isAnEnvironmentRecord(record)) {
    // if the record is the current environment record, the identifier may be a parameter
    if (record === context.scopeManager.getCurrentEnvironmentRecord()) {
      const parameter = getParameter(context.functionInfo, node.name);

      if (parameter) {
        return parameter;
      }
    }

    const identifierReference = getIdentifierReference(record, node.name);

    if (isUnresolvableReference(identifierReference)) {
      value = createReference(context.scopeManager.createValueIdentifier());

      context.addInstructions([
        createCallInstruction(
          value.identifier,
          null,
          createIdentityFunctionDefinition(),
          [createNull()],
          node.loc,
        ),
      ]);
    } else {
      let identifierReferenceBase = identifierReference.base;
      let operand = createReference(identifierReferenceBase.identifier);

      value = getValue(identifierReference)!; // todo: this is guaranteed by !isUnresolvableReference but can we do better than "!"?

      if (isAnEnvironmentRecord(identifierReferenceBase)) {
        /**
         * if the identifier reference belongs to another function info, we need to access the outer environment from the `@parent` field of the scope
         */
        if (identifierReferenceBase.functionInfo !== context.functionInfo) {
          operand = createReference(record.identifier);

          let distance = 0;
          let outerEnv: EnvironmentRecord | null = record;

          while (outerEnv !== null && outerEnv.identifier !== identifierReferenceBase.identifier) {
            distance++;

            outerEnv = outerEnv.outerEnv;
          }

          for (let i = 0; i < distance; i++) {
            const parentReference = createReference(context.scopeManager.createValueIdentifier());

            context.addInstructions([
              createCallInstruction(
                parentReference.identifier,
                null,
                createGetFieldFunctionDefinition('@parent'),
                [operand],
                node.loc,
              ),
            ]);

            operand = parentReference;
          }
        }
      }

      value = createReference2(context.scopeManager.createValueIdentifier(), value);

      context.addInstructions([
        createCallInstruction(
          value.identifier,
          null,
          createGetFieldFunctionDefinition(node.name),
          [operand],
          node.loc,
        ),
      ]);
      //
      // // if the value is a constant, we return the scope that belongs to the constant value type
      // if (isAConstant(value)) {
      //   record = context.scopeManager.valueByConstantTypeRegistry.get(typeof value.value)!; // todo: we need to do better
      // }
    }
  } else if (isAParameter(record)) {
    value = createReference2(context.scopeManager.createValueIdentifier(), record);

    context.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createGetFieldFunctionDefinition(node.name),
        [createReference(record.identifier)],
        node.loc,
      ),
    ]);
  } else {
    const binding = record.bindings.get(node.name);

    if (binding) {
      value = createReference2(context.scopeManager.createValueIdentifier(), binding);

      context.addInstructions([
        createCallInstruction(
          value.identifier,
          null,
          createGetFieldFunctionDefinition(node.name),
          [createReference(record.identifier)],
          node.loc,
        ),
      ]);
    } else {
      value = createReference(context.scopeManager.createValueIdentifier());

      context.addInstructions([
        createCallInstruction(
          value.identifier,
          null,
          createIdentityFunctionDefinition(),
          [createNull()],
          node.loc,
        ),
      ]);

      // return a value that considers any binding as resolvable
      value = {
        ...value,
        bindings: {
          ...value.bindings,
          has: () => true,
          get: () => createNull(),
        },
      };
    }
  }

  return value;
};
