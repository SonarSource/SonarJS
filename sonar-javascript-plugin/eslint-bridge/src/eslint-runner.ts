import { Linter } from "eslint";
import { parseSourceFile, isParseError, ParseError } from "./parser";
import { getIssues } from "./rules";
import * as fs from "fs";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
interface InputRequest {
  files: File[];
  rules: Rule;
}

interface File {
  filepath: string;
  fileContent?: string;
}

export interface Rule {
  [name: string]: Linter.RuleLevel | Linter.RuleLevelAndOptions;
}

interface IssueReport {
  column: number;
  line: number;
  endColumn?: number;
  endLine?: number;
  ruleId: string | null;
  message: string;
  source: string | null;
}

export async function processRequest(input: InputRequest) {
  let output: { [filepath: string]: IssueReport[] } = {};
  for (const file of input.files) {
    const fileContent = await getFileContent(file);
    if (fileContent) {
      const sourceCode = parseSourceFile(fileContent);
      if (isParseError(sourceCode)) {
        output[file.filepath] = [toIssueReport(sourceCode)];
      } else {
        output[file.filepath] = getIssues(
          sourceCode,
          input.rules,
          file.filepath
        );
      }
    }
  }
  return output;
}

async function getFileContent(file: File) {
  if (file.fileContent) {
    return file.fileContent;
  }
  try {
    const fileContent = await readFile(file.filepath, { encoding: "UTF-8" });
    return fileContent;
  } catch (e) {
    console.error(
      `Failed to find a source file matching path ${file.filepath}`
    );
  }
}

function toIssueReport(parseError: ParseError) {
  return Object.assign(parseError, {
    ruleId: null,
    source: null,
    message: `Parse error: ${parseError.message}`
  });
}
