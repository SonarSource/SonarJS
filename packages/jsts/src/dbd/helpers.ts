import fs from 'fs/promises';
import path from 'path';
import { readFile } from '@sonar/shared';
import { buildSourceCode } from '@sonar/jsts';
import { FunctionId, FunctionInfo } from './ir-gen/ir_pb';
import { Linter } from 'eslint';
import { rule } from '../rules/S999999';

const linter = new Linter();
linter.defineRule('dbd-rule', rule);

export async function generateDirIR(
  dirPath: string,
  programId?: string,
  outDir?: string,
  print = false,
  root?: string,
) {
  for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      await generateDirIR(filePath, programId, outDir, print, root);
    } else {
      await generateIR(filePath, programId, outDir, undefined, print, root);
    }
  }
}

export async function generateIR(
  filePath: string,
  programId?: string,
  outDir?: string,
  fileContent?: string,
  print = false,
  root?: string,
) {
  if (!(filePath.endsWith('.js') || filePath.endsWith('.ts'))) {
    return;
  }
  if (!fileContent) {
    fileContent = await readFile(filePath);
  }
  const sourceCode = buildSourceCode({ fileContent, filePath, programId, fileType: 'MAIN' }, 'js');
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
  const values: { [key: number]: string } = {};

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
            return `brif bb${trueSuccessor}, bb${falseSuccessor}, ${valueToStr(condition)}`;
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
  return `${header}${blocks.join('\n')}\n}\n`;
}

function functionName(func?: FunctionId) {
  return func ? func?.signature ?? `?.${func?.simpleName}` : '';
}
