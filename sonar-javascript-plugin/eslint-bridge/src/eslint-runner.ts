import { parseSourceFile, isParseError, ParseError } from "./parser";
import { getIssues } from "./rules";
import * as fs from "fs";

interface InputRequest {
  filepath: string;
  fileContent?: string;
  rules: Rule[];
}

// TODO: Consider rules with parameters
export type Rule = string;

interface IssueReport {
  column: number;
  line: number;
  endColumn?: number;
  endLine?: number;
  ruleId: string | null;
  message: string;
  source: string | null;
}

export function processRequest(input: InputRequest) {
  let reportedIssues: IssueReport[] = [];
  const filepath = input.filepath;
  const fileContent = getFileContent(input);
  if (fileContent) {
    const sourceCode = parseSourceFile(fileContent);
    if (isParseError(sourceCode)) {
      reportedIssues = [toIssueReport(sourceCode)];
    } else {
      reportedIssues = getIssues(sourceCode, input.rules, filepath);
    }
  }
  return reportedIssues;
}

function getFileContent(input: InputRequest) {
  if (input.fileContent) {
    return input.fileContent;
  }
  try {
    const fileContent = fs.readFileSync(input.filepath, {
      encoding: "UTF-8"
    });
    return fileContent;
  } catch (e) {
    console.error(
      `Failed to find a source file matching path ${input.filepath}`
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
