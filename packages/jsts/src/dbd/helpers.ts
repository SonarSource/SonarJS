import fs from 'fs/promises';
import path from 'path';
import { readFile } from '@sonar/shared';
import { buildSourceCode } from '@sonar/jsts';
import { FunctionId, FunctionInfo } from './ir-gen/ir_pb';
import { FunctionInfo as FunctionInfo2 } from './js-to-dbd';
import { Linter } from 'eslint';
import { rule } from '../rules/S999999';
import type { FunctionDefinition } from './js-to-dbd/core/function-definition';

const linter = new Linter();
linter.defineRule('dbd-rule', rule);

export async function generateDirIR(
  dirPath: string,
  outDir?: string,
  print = false,
  root?: string,
) {
  for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      await generateDirIR(filePath, outDir, print, root);
    } else {
      await generateIR(file.path, outDir, undefined, print, root);
    }
  }
}

export async function generateIR(
  filePath: string,
  outDir?: string,
  fileContent?: string,
  print = false,
  root?: string,
) {
  if (!fileContent) {
    fileContent = await readFile(filePath);
  }
  const sourceCode = buildSourceCode(
    { fileContent, filePath, tsConfigs: [], fileType: 'MAIN' },
    'js',
  );
  linter.verify(
    sourceCode,
    { rules: { 'dbd-rule': 'error' }, settings: { dbd: { outDir, print, root } } },
    { filename: filePath, allowInlineConfig: false },
  );
}

export async function proto2text(filePaths: string[]) {
  let text = '';
  for (const filePath of filePaths) {
    const contents = await fs.readFile(filePath);
    const functionInfo = FunctionInfo.fromBinary(contents);
    text += functionInto2Text(functionInfo);
  }
  return text;
}

export function functionInto2Text(functionInfo: FunctionInfo) {
  const values: { [key: number]: string } = { 0: 'null' };

  if (functionInfo.values) {
    for (const parameter of functionInfo.values.parameters) {
      values[parameter.valueId] = parameter.typeInfo
        ? `param ${parameter.typeInfo?.qualifiedName} ${parameter.name}`
        : `param ${parameter.name}`;
    }
    for (const constant of functionInfo.values.constants) {
      values[constant.valueId] = constant.value;
    }
    for (const typeName of functionInfo.values.typeNames) {
      values[typeName.valueId] = `type ${typeName.name}`;
    }
  }
  function valueToStr(valueId?: number, name?: string) {
    if (typeof valueId === 'number') {
      if (typeof name === 'string') {
        return `${name}#${valueId}`;
      }
      return `${values[valueId] ?? ''}#${valueId}`;
    }
    return '';
  }
  const params = functionInfo.parameters.map(p => `${p.name}#${p.valueId}`).join(', ');
  const header = `${functionInfo.functionId?.signature ?? `?.${functionInfo.functionId?.simpleName}`} (${params}) {\n`;
  const blocks = functionInfo.basicBlocks.map(b => {
    let blockStr = `bb${b.id}`;
    if (typeof b.loopId === 'number') {
      blockStr += `(loopId=${b.loopId}`;
      if (typeof b.parentLoopId === 'number') {
        blockStr += `, parentLoopId=${b.parentLoopId}`;
      }
      if (b.isLoopCondition) {
        blockStr += `, loopCondition`;
      }
      blockStr += ')';
    }
    blockStr += ':\n';
    blockStr += b.instructions
      .map(i => {
        switch (i.instr.case) {
          case 'throwInstruction':
            return `throw ${valueToStr(i.instr.value.exceptionValue)}`;
          case 'returnInstruction':
            return `return ${valueToStr(i.instr.value.returnValue)}`;
          case 'branchingInstruction':
            return `br bb${i.instr.value.successor}`;
          case 'conditionalBranchingInstruction': {
            const { trueSuccessor, falseSuccessor, condition } = i.instr.value;
            return `brif bb${trueSuccessor}, bb${falseSuccessor} ${valueToStr(condition)}`;
          }
          case 'phiInstruction':
            const { variableName, valueId, valuesByBlock } = i.instr.value;
            const str = Object.entries(valuesByBlock)
              .map(([blockId, valueId]) => `bb${blockId}: ${valueToStr(valueId)}`)
              .join(', ');
            return `${valueToStr(valueId, variableName)} = phi ${str}`;
          case 'callInstruction': {
            const {
              functionId,
              variableName,
              valueId,
              arguments: args,
              staticType,
            } = i.instr.value;
            const name = functionName(functionId);
            const argumentsStr = args?.map(arg => valueToStr(arg)).join(', ') ?? '';
            const returnType = staticType ? `:${staticType.qualifiedName}` : '';
            return `${valueToStr(valueId, variableName)} = call ${name}(${argumentsStr})${returnType}`;
          }
        }
      })
      .map(ins => `  ${ins}`)
      .join('\n');
    return blockStr;
  });
  return `${header}${blocks}\n}\n`;
}

export function functionInto2Text2(functionInfo: FunctionInfo2) {
  const values: { [key: number]: string } = { 0: 'null' };

  // if (functionInfo.values) {
  //   for (const parameter of functionInfo.values.parameters) {
  //     values[parameter.valueId] = parameter.typeInfo
  //       ? `param ${parameter.typeInfo?.qualifiedName} ${parameter.name}`
  //       : `param ${parameter.name}`;
  //   }
  //   for (const constant of functionInfo.values.constants) {
  //     values[constant.valueId] = constant.value;
  //   }
  //   for (const typeName of functionInfo.values.typeNames) {
  //     values[typeName.valueId] = `type ${typeName.name}`;
  //   }
  // }
  function valueToStr(valueId?: number, name?: string) {
    if (typeof valueId === 'number') {
      if (typeof name === 'string') {
        return `${name}#${valueId}`;
      }
      return `${values[valueId] ?? ''}#${valueId}`;
    }
    return '';
  }
  const params: Array<string> = []; // functionInfo.parameters.map(p => `${p.name}#${p.valueId}`).join(', '); todo
  const header = `${functionInfo.definition?.signature ?? `?.${functionInfo.definition?.name}`} (${params}) {\n`;

  console.log(functionInfo);

  const blocks = functionInfo.blocks.map(b => {
    let blockStr = `bb${b.identifier}`;
    if (typeof b.loopId === 'number') {
      blockStr += `(loopId=${b.loopId}`;
      if (typeof b.parentLoopId === 'number') {
        blockStr += `, parentLoopId=${b.parentLoopId}`;
      }
      if (b.isLoopCondition) {
        blockStr += `, loopCondition`;
      }
      blockStr += ')';
    }
    blockStr += ':\n';
    blockStr += b.instructions
      .map(i => {
        console.log(i);

        switch (i.type) {
          // case 'throwInstruction':
          //   return `throw ${valueToStr(i.instr.value.exceptionValue)}`;
          case 'return':
            return `return ${valueToStr(i.operands[0].identifier)}`;
          case 'branching':
            return `br bb${i.destination.identifier}`;
          case 'conditional_branching': {
            const { consequentBlock, alternateBlock, operands } = i;
            return `brif bb${consequentBlock.identifier}, bb${alternateBlock.identifier} ${valueToStr(operands[0].identifier)}`;
          }
          case 'phi':
            const { variableName, valueIndex: valueId, valuesByBlock } = i;
            const str = Object.entries(valuesByBlock)
              .map(([blockId, valueId]) => `bb${blockId}: ${valueToStr(valueId)}`)
              .join(', ');
            return `${valueToStr(valueId, variableName!)} = phi ${str}`; // todo: variableName may be null
          case 'call': {
            const {
              functionDefinition,
              variableName,
              valueIndex: valueId,
              operands: args,
              staticType,
            } = i;
            const name = functionName2(functionDefinition);
            const argumentsStr = args?.map(arg => valueToStr(arg.identifier)).join(', ') ?? '';
            const returnType = staticType ? `:${staticType.qualifiedName}` : '';
            return `${valueToStr(valueId, variableName!)} = call ${name}(${argumentsStr})${returnType}`; // todo: variableName may be null
          }
        }
      })
      .map(ins => `  ${ins}`)
      .join('\n');
    return blockStr;
  });
  return `${header}${blocks}\n}\n`;
}

function functionName(func?: FunctionId) {
  return func ? func?.signature ?? `?.${func?.simpleName}` : '';
}

function functionName2(func?: FunctionDefinition) {
  return func ? func?.signature ?? `?.${func?.name}` : '';
}
