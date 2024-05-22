import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const packageJson = require(path.join('..', '..', 'package.json'));
const typesVersion = packageJson.devDependencies['@types/estree'];

const typesPath = path.join('..', '..', 'node_modules', '@types', 'estree', 'index.d.ts');
const file = ts.createSourceFile(
  typesPath,
  fs.readFileSync(typesPath, 'utf-8'),
  ts.ScriptTarget.ESNext,
);

for (const statement of file.statements) {
  // if (isTypeScriptDeclaration(statement)) {
  //   continue;
  // }
  console.log(statement);
}

function isTypeScriptDeclaration(statement: ts.Statement) {
  return (
    ts.isInterfaceDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  );
}
