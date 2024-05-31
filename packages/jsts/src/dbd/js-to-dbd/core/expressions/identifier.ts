import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createGetFieldFunctionDefinition,
  createIdentityFunctionDefinition,
} from '../function-definition';
import { createReference } from '../values/reference';
import { createNull, isAConstant } from '../values/constant';
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
        return {
          record: parameter,
          value: parameter,
        };
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

      // todo: probably we have to emit a scope that always resolve bindings (see comment of this function)

      record = value;
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

      // we need to keep track of the type of the value, so we create a new one from the existing one
      // todo: this is only needed for function references so, whenever the DBD engine is able to call functions by reference, we can remove this
      value = {
        ...value,
        identifier: context.scopeManager.createValueIdentifier(),
      };

      context.addInstructions([
        createCallInstruction(
          value.identifier,
          null,
          createGetFieldFunctionDefinition(node.name),
          [operand],
          node.loc,
        ),
      ]);

      // if the value is a constant, we return the scope that belongs to the constant value type
      if (isAConstant(value)) {
        record = context.scopeManager.valueByConstantTypeRegistry.get(typeof value.value)!; // todo: we need to do better
      } else {
        record = value;
      }
    }
  } else {
    value = createReference(context.scopeManager.createValueIdentifier());

    if (isAParameter(record) || record.bindings.has(node.name)) {
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
      context.addInstructions([
        createCallInstruction(
          value.identifier,
          null,
          createIdentityFunctionDefinition(),
          [createNull()],
          node.loc,
        ),
      ]);

      // return a scope that considers any name as a resolvable binding
      record = {
        ...value,
        bindings: {
          ...value.bindings,
          has: () => true,
        },
      };
    }
  }

  return {
    value,
    record,
  };
};
