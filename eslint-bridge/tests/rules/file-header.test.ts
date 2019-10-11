import { RuleTester } from "eslint";
import { rule } from "../../src/rules/file-header";

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018 },
});

const errors = [
  {
    message: "Add or update the header of this file.",
    line: 0,
    column: 1,
  },
];

const file1 = `// copyright 2005
function file1() {
}
`;

const file2 = `// copyright 2012
// foo
function file2() {
}
`;

const file3 = `/*foo http://www.example.org*/
function file3() {
}
`;

ruleTester.run("File header", rule, {
  valid: [
    valid(`foo();`, "", true),

    valid(file1, "// copyright 2005", false),
    valid(file2, "// copyright 2012", false),
    valid(file2, "// copyright 2012\n// foo", false),
    valid(file2, "// copyright 2012\r\n// foo", false),
    valid(file3, "/*foo http://www.example.org*/", false),

    valid(file1, "// copyright 2005", true),
    valid(file1, "// copyright 20\\d\\d", true),
    valid(file2, "// copyright 20\\d\\d", true),
    valid(file2, "// copyright 20\\d\\d\\n// foo", true),
    valid(file2, "// copyright 20\\d{2}\\r?\\n// foo", true),

    // invalid regexp, should log error
    valid("whatever", "*", true),
  ],
  invalid: [
    invalid(`foo();`, "// companyName", false),
    invalid(file1, "// copyright 20\\d\\d", false),
    invalid(file2, "// copyright 2005", false),
    invalid(file2, "// copyright 2012\r\r// foo", false),
    invalid(file2, "// copyright 2012\n// foo\n\n\n\n\n\n\n\n\n\ngfoo", false),

    invalid(file2, "// copyright 20\\d{3}\\n// foo", true),
    invalid(file2, "// copyright 20\\d\\d\\r// foo", true),
  ],
});

function valid(code: string, headerFormat: string, isRegularExpression: boolean) {
  return {
    code,
    options: [
      {
        headerFormat,
        isRegularExpression,
      },
    ],
  };
}

function invalid(code: string, headerFormat: string, isRegularExpression: boolean = false) {
  return {
    code,
    options: [
      {
        headerFormat,
        isRegularExpression,
      },
    ],
    errors,
  };
}
