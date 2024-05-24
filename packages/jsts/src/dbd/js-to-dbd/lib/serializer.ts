import {Enum, Field, MapField, OneOf, Root, Type} from "protobufjs";
import type {FunctionInfo} from "./function-info";
import {basename, extname} from "node:path";
import type {Constant} from "./values/constant";
import {createNull} from "./values/null";
import type {Instruction} from "./instruction";

const basicBlock = new Type('BasicBlock')
  .add(new Field('identifier', 1, 'int32'))
  .add(new Field('instructions', 2, 'Instruction', 'repeated'))
  .add(new Field('exception_handler', 3, 'BasicBlock'))
  .add(new Field('location', 4, 'Location'))
  .add(new Field('loopId', 5, 'int32'))
  .add(new Field('parentLoopId', 6, 'int32'))
  .add(new Field('isLoopCondition', 7, 'bool'))
;

const branchingInstruction = new Type('BranchingInstruction')
  .add(new Field('location', 1, 'Location'))
  .add(new Field('successor', 2, 'int32'))
;

const callInstruction = new Type('CallInstruction')
  .add(new Field('location', 1, 'Location'))
  .add(new Field('valueIdentifier', 2, 'int32'))
  .add(new Field('variableName', 3, 'string'))
  .add(new Field('functionDefinition', 4, 'FunctionDefinition'))
  .add(new Field('arguments', 5, 'int32', 'repeated'))
  .add(new Field('staticType', 6, 'TypeInfo'))
  .add(new Field('isInstanceMethodCall', 7, 'bool'))
;

const conditionalBranchingInstruction = new Type('ConditionalBranchingInstruction')
  .add(new Field('location', 1, 'Location'))
  .add(new Field('condition', 2, 'int32'))
  .add(new Field('consequentBlock', 3, 'int32'))
  .add(new Field('alternateBlock', 4, 'int32'))
;

const constant = new Type('Constant')
  .add(new Field('identifier', 1, 'int32'))
  .add(new Field('value', 2, 'string'))
  .add(new Field('typeInfo', 3, 'TypeInfo'))
;

const functionInfo = new Type('FunctionInfo')
  .add(new Field('definition', 1, 'FunctionDefinition'))
  .add(new Field('valueTable', 2, 'ValueTable'))
  .add(new Field('parameters', 3, 'Parameter', 'repeated'))
  .add(new Field('blocks', 4, 'BasicBlock', 'repeated'))
  .add(new Field('fileName', 5, 'string'))
;

const functionDefinition = new Type('FunctionDefinition')
  .add(new Field('name', 1, 'string'))
  .add(new Field('signature', 2, 'string'))
  .add(new Field('returnType', 3, 'TypeInfo'))
  .add(new Field('isVirtual', 4, 'bool'))
  .add(new Field('isAStandardLibraryFunction', 5, 'bool'))
  .add(new Field('isFunctionRef', 6, 'bool'))
;

const instruction = new Type('Instruction')
  .add(
    new OneOf('instr', {}, {})
      .add(new Field('call', 1, 'CallInstruction'))
      .add(new Field('return', 2, 'ReturnInstruction'))
      .add(new Field('branching', 3, 'BranchingInstruction'))
      .add(new Field('conditional_branching', 4, 'ConditionalBranchingInstruction'))
      .add(new Field('phi', 5, 'PhiInstruction'))
      .add(new Field('throw', 6, 'ThrowInstruction'))
  )
;

const location = new Type('Location')
  .add(new Field('filename', 1, 'string'))
  .add(new Field('start_line', 2, 'int32'))
  .add(new Field('start_column', 3, 'int32'))
  .add(new Field('end_line', 4, 'int32'))
  .add(new Field('end_column', 5, 'int32'))
;

const nullType = new Type('Null')
  .add(new Field('identifier', 1, 'int32'))
;

const parameter = new Type('Parameter')
  .add(new Field('identifier', 1, 'int32'))
  .add(new Field('name', 2, 'string'))
  .add(new Field('definitionLocation', 3, 'Location'))
  .add(new Field('typeInfo', 4, 'TypeInfo'))
;

const phiInstruction = new Type('PhiInstruction')
  .add(new Field('valueIdentifier', 1, 'int32'))
  .add(new Field('variableName', 2, 'string'))
  .add(new MapField('valuesByBlock', 3, 'int32', 'int32'))
;

const returnInstruction = new Type('ReturnInstruction')
  .add(new Field('location', 1, 'Location'))
  .add(new Field('returnValue', 2, 'int32'))
;

const throwInstruction = new Type('ThrowInstruction')
  .add(new Field('location', 1, 'Location'))
  .add(new Field('exceptionValue', 2, 'int32'))
;

const typeInfo = new Type('TypeInfo')
  .add(new Enum('Kind', {
    PRIMITIVE: 0,
    CLASS: 1,
    INTERFACE: 2,
    ARRAY: 3
  }))
  .add(new Field('kind', 1, 'Kind'))
  .add(new Field('qualifiedName', 2, 'string'))
  .add(new Field('super_types', 3, 'string', 'repeated'))
  .add(new Field('hasIncompleteSemantics', 4, 'bool'))
;

const typeNameType = new Type('TypeName')
  .add(new Field('identifier', 1, 'int32'))
  .add(new Field('name', 2, 'string'))
  .add(new Field('typeInfo', 3, 'TypeInfo',))
;

const valueTable = new Type('ValueTable')
  .add(new Field('null', 1, 'Null'))
  .add(new Field('constants', 2, 'Constant', 'repeated'))
  .add(new Field('parameters', 3, 'Parameter', 'repeated'))
  .add(new Field('typeNames', 4, 'TypeName', 'repeated'))
;

export const sonarSourceIRNamespace = new Root()
  .add(basicBlock)
  .add(branchingInstruction)
  .add(callInstruction)
  .add(conditionalBranchingInstruction)
  .add(constant)
  .add(functionInfo)
  .add(functionDefinition)
  .add(instruction)
  .add(location)
  .add(nullType)
  .add(parameter)
  .add(phiInstruction)
  .add(returnInstruction)
  .add(throwInstruction)
  .add(typeInfo)
  .add(typeNameType)
  .add(valueTable)
;

export const serialize = (
  functionInfos: Array<FunctionInfo>,
  fileName: string
): {
  outputs: Array<{
    name: string;
    data: Uint8Array;
  }>;
  metadata: Array<string>;
} => {
  const outputs: Array<{
    name: string;
    data: Uint8Array;
  }> = [];

  /**
   * Creates and returns a serializable representation of the passed `functionInfo`.
   */
  const createSerializableFunctionInfo = (
      functionInfo: FunctionInfo
    ): Record<string, any> => {
      const constants: Array<Constant> = [];
      const nullValue = createNull();

      const createSerializableInstruction = (instruction: Instruction): Record<string, any> => {
        let result: Record<string, any> = {};

        for (const operand of instruction.operands) {
          if (operand.type === "constant") {
            constants.push(operand);
          }
        }

        if (instruction.type === "call") {
          result = {
            ...instruction,
            valueIdentifier: instruction.valueIndex,
            arguments: instruction.operands.map((operand) => {
              if (operand.type === "constant") {
                if (operand.value === null) { // todo: check if still needed
                  return nullValue.identifier;
                }
              }

              return operand.identifier;
            })
          }
        } else if (instruction.type === "branching") {
          result = {
            ...instruction,
            successor: instruction.destination.identifier
          }
        } else if (instruction.type === "conditional_branching") {
          result = {
            ...instruction,
            consequentBlock: instruction.consequentBlock.identifier,
            alternateBlock: instruction.alternateBlock ? instruction.alternateBlock.identifier : 0,
            condition: instruction.operands[0].identifier
          }
        } else if (instruction.type === "return") {
          result = {
            ...instruction,
            returnValue: instruction.operands[0].identifier
          }
        } else if (instruction.type === "phi") {
          const valuesByBlock: Record<number, number> = {};

          for (const [block, value] of instruction.valuesByBlock) {
            valuesByBlock[block.identifier] = value.identifier;
          }

          result = {
            ...instruction,
            valueIdentifier: instruction.valueIndex,
            valuesByBlock
          };
        }

        const {location} = instruction;

        result.location = {
          start_line: location.start.line,
          start_column: location.start.column,
          end_line: location.end.line,
          end_column: location.end.column,
          filename: functionInfo.fileName
        };

        return result;
      };

      return {
        ...functionInfo,
        blocks: functionInfo.blocks.map((block) => {
          return {
            ...block,
            instructions: block.instructions
              .map((instruction) => {
                return {
                  [(instruction as Instruction).type]: createSerializableInstruction(instruction as Instruction)
                };
              })
          }
        }),
        valueTable: {
          constants: constants.map((constant) => {
            return {
              ...constant,
              value: `${constant.value}`
            }
          }),
          null: nullValue
        }
      };
    }
  ;

  const metadata: Array<string> = [];
  const slug = basename(fileName, extname(fileName));
  const FunctionInfo = sonarSourceIRNamespace.lookupType('FunctionInfo');

  for (const functionInfo of functionInfos) {
    const {definition} = functionInfo;

    metadata.push(`${slug}.${definition.signature}`);

    const serializableFunctionInfo = createSerializableFunctionInfo(functionInfo);
    const message = FunctionInfo.create(serializableFunctionInfo);
    const data = FunctionInfo.encode(message).finish();

    outputs.push({
      data,
      name: `${slug}_${definition.name}`
    })
  }

  return {
    outputs,
    metadata
  };
};
