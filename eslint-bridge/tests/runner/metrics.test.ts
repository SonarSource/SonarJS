/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as fs from "fs";
import * as path from "path";
import * as metrics from "../../src/runner/metrics";
import { parseTypeScriptSourceFile } from "../../src/parser";
import { SourceCode } from "eslint";

it("should return lines of code", () => {
  const sourceCode = parseTS(
    `/*
      * header
      */
     class /*after first token*/ A {

       get b() { // comment
         return \`hello
           world\`;
       }
       // comment
     }
     /* multi
     line
     comment */`,
  );
  expect(metrics.findLinesOfCode(sourceCode)).toEqual([4, 6, 7, 8, 9, 11]);
});

it("should return comment lines with header ignoring and no header comment", () => {
  expect(
    comments(
      `x; // NoSonar foo
    y; /* NOSONAR */
    // NOSONAR

    z; // NOOOSONAR
    z; // some comment
    
    //   

    /*  
        */
       
    /**   */`,
      true,
    ),
  ).toEqual([5, 6]);
});

it("should return comment lines with header ignoring and block header comment", () => {
  expect(
    comments(
      `/* header */
    x;
    y; /*
      some coment
    */`,
      true,
    ),
  ).toEqual([3, 4, 5]);
});

it("should return comment lines with header ignoring and special block header comment", () => {
  expect(
    comments(
      `/** header */
    x;
    y; /*
      some coment
    */`,
      true,
    ),
  ).toEqual([3, 4, 5]);
});

it("should return comment lines with header ignoring and line header comment", () => {
  expect(
    comments(
      `// header
    x;
    y; /*
      some coment
    */`,
      true,
    ),
  ).toEqual([3, 4, 5]);
});

it("should return comment lines without header ignoring and block header comment", () => {
  expect(
    comments(
      `/* header */
    x;
    y; /*
    some coment
    */`,
      false,
    ),
  ).toEqual([1, 3, 4, 5]);
});

it("should return comment lines without header ignoring and no header comment", () => {
  expect(
    comments(
      `x;
    y; /*
    some coment
    */`,
      false,
    ),
  ).toEqual([2, 3, 4]);
});

it("should return NOSONAR lines", () => {
  const sourceCode = parseTS(
    `x; // NoSonar foo
     y; /* NOSONAR */
     // NOSONAR
     z; // NOOOSONAR
     z; // some comment`,
  );
  expect(metrics.findCommentLines(sourceCode, true).nosonarLines).toEqual([1, 2, 3]);
});

it("should return executable lines", () => {
  // executable lines simply have trailling comments in the fixture file
  const sourceCode = parseTS(
    fs.readFileSync(path.join(__dirname, "./fixtures/executableLines.lint.ts"), "utf-8"),
  );
  expect(metrics.findExecutableLines(sourceCode)).toEqual(
    metrics.findCommentLines(sourceCode, true).commentLines,
  );
});

it("should count functions", () => {
  const sourceCode = parseTS(
    `class A {
       foo() { // 1
         return function(){};// 2
       }
       get x() { // 3
         return 42;
       }
     }
     function bar(){ // 4
       return ()=>42; // 5
     }
     function * gen(){} // 6`,
  );
  expect(metrics.countFunctions(sourceCode)).toEqual(6);
});

it("should count statements", () => {
  const sourceCode = parseTS(
    `let x = 42; // 1
    ; // 2
    foo(); // 3
    if (x) {} // 4
    while(x) break // 5 + 6
    function foo() {
      debugger; // 7
      return;   // 8
    }
    try { // 9
      do{} while (x); // 10
    } catch (e) {}
    finally {}`,
  );
  expect(metrics.countStatements(sourceCode)).toEqual(10);
});

it("should count classes", () => {
  const sourceCode = parseTS(
    `class A { // 1
      foo() {
        return class {}; // 2
      }
    }`,
  );
  expect(metrics.countClasses(sourceCode)).toEqual(2);
});

it("should compute cyclomatic complexity", () => {
  expect(cyclomaticComplexity(`1 && 2;`)).toEqual(1);
  expect(cyclomaticComplexity(`function foo() { 1 || 2; }`)).toEqual(2);
  expect(cyclomaticComplexity(`while (true) { foo(); }`)).toEqual(1);
  expect(cyclomaticComplexity(`if (null) { return; }`)).toEqual(1);
  expect(cyclomaticComplexity(`try {} catch (e) {}`)).toEqual(0);
});

function cyclomaticComplexity(code: string): number {
  const sourceCode = parseTS(code);
  return metrics.getCyclomaticComplexity(sourceCode);
}

function comments(code: string, ignoreHeader: boolean): number[] {
  const sourceCode = parseTS(code);
  return metrics.findCommentLines(sourceCode, ignoreHeader).commentLines;
}

function parseTS(code: string) {
  const sourceCode = parseTypeScriptSourceFile(code, "foo.ts", []);
  if (!(sourceCode instanceof SourceCode)) {
    throw new Error("Failed to parse " + sourceCode);
  }
  return sourceCode;
}
