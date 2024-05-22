const packageJson = require('../../package.json');
const typesVersion = packageJson.devDependencies['@types/estree'];

import ts from 'typescript';
import fs from 'node:fs';

const path = '../../node_modules/@types/estree/index.d.ts';
const file = ts.createSourceFile(path, fs.readFileSync(path, 'utf-8'), ts.ScriptTarget.ESNext);

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
