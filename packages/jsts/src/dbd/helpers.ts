import fs from 'fs/promises';
import path from 'path';
import { readFile } from '@sonar/shared';
import { buildSourceCode } from '@sonar/jsts';
import { FunctionInfo } from './ir-gen/ir_pb';
import { Linter } from 'eslint';
import { rule } from '../rules/S99999';

const linter = new Linter();
linter.defineRule('dbd-rule', rule);

export async function generateDirIR(dirPath: string, outDir?: string, print = false) {
  for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      await generateDirIR(filePath, outDir, print);
    } else {
      await generateIR(file.path, outDir, undefined, print);
    }
  }
}

export async function generateIR(
  filePath: string,
  outDir?: string,
  fileContent?: string,
  print = false,
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
    { rules: { 'dbd-rule': 'error' }, settings: { dbd: { IRPath: outDir, print } } },
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
            return `throw ${i.instr.value.exceptionValue}`;
          case 'returnInstruction':
            return `return ${i.instr.value.returnValue}`;
          case 'branchingInstruction':
            return `br bb${i.instr.value.successor}`;
          case 'conditionalBranchingInstruction': {
            const condIf = i.instr.value;
            return `brif bb${condIf.trueSuccessor}, bb${condIf.falseSuccessor} ${condIf.condition}`;
          }
          case 'phiInstruction':
            break;
          case 'callInstruction': {
            const callIns = i.instr.value;
            const functionName =
              callIns.functionId?.signature ?? `?.${callIns.functionId?.simpleName}`;
            const argumentsStr = callIns.arguments?.map(arg => valueToStr(arg)).join(', ') ?? '';
            const returnType = callIns.staticType ? `:${callIns.staticType.qualifiedName}` : '';
            return `${callIns.variableName ?? ''}#${callIns.valueId} = call ${functionName}(${argumentsStr})${returnType}`;
          }
        }
      })
      .map(ins => `  ${ins}`)
      .join('\n');
    return blockStr;
  });
  return `${header}${blocks}\n}\n`;
}

function valueToStr(valueId: number) {
  return `${valueId}`;
}
