import {AST_NODE_TYPES, TSESTree} from "@typescript-eslint/typescript-estree";
import type {Instruction} from "./instruction";
import {createCallInstruction} from "./instructions/call-instruction";
import {
  createBinaryOperationFunctionDefinition,
  createGetFieldFunctionDefinition,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition
} from "./function-definition";
import {createReference} from "./values/reference";
import {createConstant} from "./values/constant";
import {ScopeManager} from "./scope-manager";
import type {Value} from "./value";
import {createNull} from "./values/null";

type CompilationResult = {
  instructions: Array<Instruction>;
  value: Value;
};

export type Compiler = (
  node: TSESTree.Node
) => CompilationResult;

export const createCompiler = (
  scopeManager: ScopeManager
): Compiler => {
  const compileNode: Compiler = (node) => {
    console.log('  compileNode', node.type);

    switch (node.type) {
      case AST_NODE_TYPES.Literal: {
        const instructions: Array<Instruction> = [];

        let value: Value;

        if (node.value === null) {
          value = createNull();
        } else {
          value = createConstant(scopeManager.createValueIdentifier(), node.value);
        }

        return {
          instructions,
          value
        };
      }

      case AST_NODE_TYPES.BinaryExpression: {
        const instructions: Array<Instruction> = [];

        const {left, right, operator} = node;

        const {
          instructions: rightInstructions,
          value: rightValue
        } = compileNode(right);

        const {
          instructions: leftInstructions,
          value: leftValue
        } = compileNode(left);

        instructions.push(...rightInstructions);
        instructions.push(...leftInstructions);

        const value = createReference(scopeManager.createValueIdentifier());

        instructions.push(createCallInstruction(
          value.identifier,
          null,
          createBinaryOperationFunctionDefinition(operator),
          [
            leftValue,
            rightValue
          ],
          node.loc
        ));

        return {
          instructions,
          value
        };
      }

      case AST_NODE_TYPES.Identifier:
      case AST_NODE_TYPES.PrivateIdentifier: {
        const {name} = node;

        const variableAndOwner = scopeManager.getVariableAndOwner(name);

        if (variableAndOwner) {
          const {variable} = variableAndOwner;
          const assignment = scopeManager.getAssignment(variable);

          if (assignment) {
            return {
              instructions: [],
              value: createReference(assignment.identifier)
            };
          }
        }

        return {
          instructions: [],
          value: createNull()
        }
      }

      case AST_NODE_TYPES.MemberExpression: {
        const {object, property} = node;
        const instructions: Array<Instruction> = [];

        console.log('>>>', object.type, property.type);

        let memberValue: Value;
        let objectValue: Value | null = null;

        if (object.type === AST_NODE_TYPES.Identifier) {
            const variableName = object.name;
            const variableAndOwner = scopeManager.getVariableAndOwner(variableName);

            if (variableAndOwner) {
              const {variable, owner} = variableAndOwner;
              const assignment = scopeManager.getAssignment(variable);

              if (assignment) {
                const objectValueIdentifier = scopeManager.createValueIdentifier();

                objectValue = createReference(objectValueIdentifier);

                instructions.push(createCallInstruction(
                  objectValueIdentifier,
                  null,
                  createGetFieldFunctionDefinition(
                    variable.name,
                  ),
                  [
                    createReference(owner.identifier)
                  ],
                  node.loc
                ));
              }
            }

            if (objectValue === null) {
              objectValue = createNull();
            }
        }
        else {
          const compilationResult = compileNode(object);

          instructions.push(...compilationResult.instructions);

          objectValue = compilationResult.value;
        }

        if (property.type === AST_NODE_TYPES.Identifier) {
          const memberValueIdentifier = scopeManager.createValueIdentifier();

          instructions.push(createCallInstruction(
            memberValueIdentifier,
            null,
            createGetFieldFunctionDefinition(
              property.name,
            ),
            [
              objectValue
            ],
            node.loc
          ));

          memberValue = createReference(memberValueIdentifier);
        }
        else {
          // todo: handle the other cases
          memberValue = createNull();
        }

        const {instructions: propertyInstructions} = compileNode(property);

        return {
          instructions: [
            ...instructions,
            ...propertyInstructions
          ],
          value: memberValue
        };
      }

      case AST_NODE_TYPES.ObjectExpression: {
        const {properties} = node;

        const objectValueIdentifier = scopeManager.createValueIdentifier();
        const objectValue = createReference(objectValueIdentifier);

        const instructions: Array<Instruction> = [createCallInstruction(
          objectValueIdentifier,
          null,
          createNewObjectFunctionDefinition(),
          [],
          node.loc
        )];

        for (const property of properties) {
          if (property.type === AST_NODE_TYPES.Property) {
            const {value: propertyValue, instructions: propertyValueInstructions} = compileNode(property.value);
            const {instructions: propertyKeyInstructions} = compileNode(property.key);

            instructions.push(...propertyKeyInstructions);
            instructions.push(...propertyValueInstructions);

            instructions.push(createCallInstruction(
              scopeManager.createValueIdentifier(),
              null,
              /**
               * todo
               * It seems like DBD IR is nob able to support property names being value references.
               * This is because the `set-field` call doesn't support the property name to be passed as
               * operand:
               * `foo.x = 5` translates to `call #set-field# x(foo, 5)` instead of `call #set-field# (foo, x, 5)`
               */
              createSetFieldFunctionDefinition((property.key as TSESTree.Identifier).name),
              [
                objectValue,
                propertyValue
              ],
              node.loc
            ));
          }
        }

        return {
          instructions,
          value: objectValue
        };
      }

      default: {
        return {
          instructions: [],
          value: createNull()
        };
      }
    }
  };

  return compileNode;
};
