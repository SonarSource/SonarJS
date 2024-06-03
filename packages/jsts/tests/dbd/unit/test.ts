import {
  createTranspiler,
  type Instruction,
  type Value,
  serialize,
  createVariable,
} from '../../../src/dbd';
import { outputFileSync, emptyDirSync } from 'fs-extra';
import { createParser } from '../../../src/dbd/js-to-dbd/core/parser';
import { createNull } from '../../../src/dbd/js-to-dbd/core/values/constant';

const serializeOperands = (operands: Array<Value>): string => {
  return operands.map(serializeValue).join(',');
};

const serializeValue = (value: Value): string => {
  let result = '';

  if (value.type === 'constant') {
    result += `constant ${value.value}`;
  }

  if (value.type === 'parameter') {
    result += `param `;
  }

  if (value.type === 'reference' && value.identifier === createNull().identifier) {
    result += `null`;
  }

  result += `#${value.identifier}`;

  return result;
};

const serializeInstruction = (instruction: Instruction): string => {
  if (instruction.type === 'branching') {
    return `br ${instruction.destination.identifier}`;
  }

  if (instruction.type === 'conditional_branching') {
    return `brif ${instruction.consequentBlock.identifier},${instruction.alternateBlock.identifier},#${instruction.operands[0].identifier}`;
  }

  if (instruction.type === 'call') {
    return `${instruction.variableName || ''}#${instruction.valueIndex} = call ${instruction.functionDefinition.signature}(${serializeOperands(instruction.operands)})`;
  }

  if (instruction.type === 'phi') {
    //  z#5 = phi(bb0: true#4, bb1: param boolean y#3)
    const serializedArguments = [...instruction.valuesByBlock.entries()]
      .map(([block, value]) => {
        return `bb${block.identifier}:${serializeValue(value)}`;
      })
      .join(',');

    return `${instruction.variableName || ''}#${instruction.valueIndex} = phi(${serializedArguments})`;
  }

  return `return #${instruction.operands[0].identifier}`;
};

export const runTest = (name: string, code: string) => {
  emptyDirSync(`ir/python`);

  const transpile = createTranspiler([createVariable('console', 'function', true)]);
  const parse = createParser();
  const ast = parse(code);
  const functionInfos = transpile(ast, name);

  const outputs = serialize(functionInfos, name);

  for (const output of outputs) {
    outputFileSync(`ir/python/${output.name}.ir`, output.data);
    outputFileSync(`ir/python/${output.name}.metadata`, output.metadata.join('\n'));
  }

  // readable JSON
  for (const functionInfo of functionInfos) {
    functionInfo.blocks.sort((blockA, blockB) => (blockA.identifier > blockB.identifier ? 1 : -1));
  }

  outputFileSync(
    `ir/python/${name}.json`,
    JSON.stringify(
      functionInfos.map(functionInfo => {
        return {
          ...functionInfo,
          blocks: functionInfo.blocks.map(block => {
            return {
              identifier: block.identifier,
              instructions: block.instructions.map(serializeInstruction),
              scopeIdentifier: block.environmentRecord.identifier,
            };
          }),
          parameters: functionInfo.parameters.map(parameter => {
            return {
              identifier: parameter.identifier,
              name: parameter.name,
            };
          }),
          functionReferences: functionInfo.functionReferences.map(functionReference => {
            return {
              identifier: functionReference.identifier,
              signature: functionReference.functionInfo.definition.signature,
            };
          }),
        };
      }),
      undefined,
      2,
    ),
  );
};
