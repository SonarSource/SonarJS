import * as fs from "fs";
import * as path from "path";
import * as metrics from "../../src/runner/metrics";
import { parseTypeScriptSourceFile } from "../../src/parser";
import { SourceCode } from "eslint";

it("should return lines of code", () => {
  const sourceCode = parseTypeScriptSourceFile(
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
    "foo.ts",
    [],
  );
  expect(metrics.findLinesOfCode(sourceCode)).toEqual([4, 6, 7, 8, 9, 11]);
});

it("should return comment lines", () => {
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

it("should return NOSONAR lines", () => {
  const sourceCode = parseTypeScriptSourceFile(
    `x; // NoSonar foo
     y; /* NOSONAR */
     // NOSONAR
     z; // NOOOSONAR
     z; // some comment`,
    "foo.ts",
    [],
  );
  expect(metrics.findCommentLines(sourceCode, true).nosonarLines).toEqual([1, 2, 3]);
});

it("should return executable lines", () => {
  // executable lines simply have trailling comments in the fixture file
  const sourceCode = parseTypeScriptSourceFile(
    fs.readFileSync(path.join(__dirname, "./fixtures/executableLines.lint.ts"), "utf-8"),
    "foo.ts",
    [],
  );
  expect(metrics.findExecutableLines(sourceCode)).toEqual(
    metrics.findCommentLines(sourceCode, true).commentLines,
  );
});

it("should count functions", () => {
  const sourceCode = parseTypeScriptSourceFile(
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
    "foo.ts",
    [],
  );
  expect(metrics.countFunctions(sourceCode)).toEqual(6);
});

it("should count statements", () => {
  const sourceCode = parseTypeScriptSourceFile(
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
    "foo.ts",
    [],
  );
  expect(metrics.countStatements(sourceCode)).toEqual(10);
});

it("should count classes", () => {
  const sourceCode = parseTypeScriptSourceFile(
    `class A { // 1
      foo() {
        return class {}; // 2
      }
    }`,
    "foo.ts",
    [],
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
  const sourceCode = parseTypeScriptSourceFile(code, "foo.ts", []);
  return metrics.getCyclomaticComplexity(sourceCode);
}

function comments(code: string, ignoreHeader: boolean): number[] {
  const sourceCode = parseTypeScriptSourceFile(code, "foo.ts", []);
  return metrics.findCommentLines(sourceCode, ignoreHeader).commentLines;
}
