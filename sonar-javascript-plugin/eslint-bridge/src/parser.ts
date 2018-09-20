import * as espree from "espree";
import { SourceCode } from "eslint";

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

export function parseSourceFile(fileContent: string): SourceCode | ParseError {
  try {
    const ast = espree.parse(fileContent, {
      tokens: true,
      comment: true,
      loc: true,
      range: true,
      ecmaVersion: 2019,
      ecmaFeatures: {
        jsx: true
      }
    });
    return new SourceCode(fileContent, ast);
  } catch (ex) {
    console.error(ex.message);
    return {
      message: ex.message,
      line: ex.lineNumber as number,
      column: ex.column as number
    };
  }
}

export function isParseError(
  sourceCode: SourceCode | ParseError
): sourceCode is ParseError {
  return !sourceCode.hasOwnProperty("ast");
}
