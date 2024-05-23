import ts, { TypeNode, isPropertySignature } from 'typescript';
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

const ignoredMembers: Set<string> = new Set([
  // The "type" member is redundant in our context.
  'type',
  'comments',
  'innerComments',
  // In BaseNodeWithoutComments, but not required.
  'range',
]);

// Types representing Protobuf
type ProtobufMessage = {
  messageName: string;
  fields: ProtobufMessageField[];
};

type ProtobufMessageField = {
  name: string;
  fieldValue: ProtobufFieldValue;
};

type ProtobufFieldValue =
  | ProtobufPrimitiveFieldValue
  | ProtobufRepeatedFieldValue
  | ProtobufOneOfFieldValue;

type ProtobufPrimitiveFieldValue = {
  type: string;
};

type ProtobufRepeatedFieldValue = {
  repeatedValue: ProtobufFieldValue;
};

type ProtobufOneOfFieldValue = {
  oneOfElements: ProtobufMessageField[];
};

type Declaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

const declarations: Record<string, Declaration> = {};

for (const statement of file.statements) {
  const declaration = statement as Declaration;
  declarations[declaration.name.getText(file)] = declaration;
}

const requestedTypes: string[] = ['BaseNodeWithoutComments', 'Program'];
function requestType(type: string) {
  if (!(type in messages) && !requestedTypes.includes(type)) {
    requestedTypes.push(type);
  }

  return { type };
}

function getFieldValueFromType(typeNode: TypeNode): ProtobufFieldValue {
  // The type is of shape "A[]", we want to generate repeated A
  if (ts.isArrayTypeNode(typeNode)) {
    return { repeatedValue: getFieldValueFromType(typeNode.elementType) };
  }
  // The type is of shape "A | B", we want to generate oneof name {A a, B b}
  if (ts.isUnionTypeNode(typeNode)) {
    if (typeNode.types.every(t => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal))) {
      // Case similar to "kind: "init" | "get" | "set";".
      // In this case, we don't want to create one field per alternative, it is enough to create one single string field of type string.
      // Note that we loose the potential exhaustiveness complier check, but adding more code to have this feature is currently overkill compared to the usefulness.
      return { type: 'string' };
    }

    const interestingTypes = typeNode.types
      // TODO: RegExpLiteral declare RegExp, where does it come from?
      .filter(t => t.getText(file) !== 'RegExpLiteral')
      // We don't need to explicitly say that a value can be undefined or null, if it is the case during serialization, we will simply not put anything.
      .filter(t => !isNullOrUndefined(t));

    if (interestingTypes.length == 1) {
      return getFieldValueFromType(interestingTypes[0]);
    }

    return {
      oneOfElements: interestingTypes.map(t => {
        return {
          name: lowerCaseFirstLetter(t.getText(file)),
          fieldValue: getFieldValueFromType(t),
        };
      }),
    };
  }

  if (ts.isLiteralTypeNode(typeNode)) {
    if (ts.isStringLiteral(typeNode.literal)) {
      return { type: 'string' };
    }
    if (
      typeNode.literal.kind === ts.SyntaxKind.TrueKeyword ||
      typeNode.literal.kind === ts.SyntaxKind.FalseKeyword
    ) {
      return { type: 'bool' };
    }
    throw new Error(
      `unexpected literal type: ${ts.SyntaxKind[typeNode.literal.kind]} (${typeNode.literal.getText(file)})`,
    );
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName.getText(file);
    if (name === 'Array' && typeNode.typeArguments?.length === 1) {
      // The type is of shape "Array<A>", we want to generate repeated A
      return { repeatedValue: getFieldValueFromType(typeNode.typeArguments[0]) };
    }
    return requestType(typeNode.typeName.getText(file));
  }

  // The type is a primitve type
  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { type: 'string' };
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BigIntKeyword:
      return { type: 'int32' };
    case ts.SyntaxKind.BooleanKeyword:
      return { type: 'bool' };
  }

  if (ts.isIndexedAccessTypeNode(typeNode)) {
    // Specific case for "ExpressionMap", as it is declared with a "keyof" logic.
    const keyOfDeclaration = declarations[
      typeNode.objectType.getText(file)
    ] as ts.InterfaceDeclaration;
    return {
      oneOfElements: keyOfDeclaration.members
        .filter(isPropertySignature)
        .filter(signature => signature.type)
        .map(s => {
          return {
            name: lowerCaseFirstLetter((s.type as TypeNode).getText(file)),
            fieldValue: getFieldValueFromType(s.type as TypeNode),
          };
        }),
    };
  }
  return { type: 'ERROR_UNEXPECTED' };
  throw new Error(`Cannot generate Protobuf field Value for typeNode ${typeNode}`);
}

function lowerCaseFirstLetter(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function isNullOrUndefined(node: ts.TypeNode): boolean {
  if (ts.isLiteralTypeNode(node)) {
    return (
      node.literal.kind === ts.SyntaxKind.NullKeyword ||
      node.literal.kind === ts.SyntaxKind.UndefinedKeyword
    );
  }
  return node.kind === ts.SyntaxKind.NullKeyword || node.kind === ts.SyntaxKind.UndefinedKeyword;
}

const messages: Record<string, ProtobufMessage> = {};

while (requestedTypes.length) {
  const requestedType = requestedTypes.pop()!;
  const declaration = declarations[requestedType];

  if (!declaration) {
    console.log('missing declaration for', requestedType);
    continue;
  }

  if (ts.isInterfaceDeclaration(declaration)) {
    const messageFields = declaration.members
      .filter(isPropertySignature)
      .filter(signature => signature.type && !ignoredMembers.has(signature.name.getText(file)))
      .map(signature => {
        return {
          name: signature.name.getText(file),
          fieldValue: getFieldValueFromType(signature.type as TypeNode),
        };
      });

    messages[requestedType] = { messageName: requestedType, fields: messageFields };
    continue;
  }

  if (ts.isTypeAliasDeclaration(declaration)) {
    messages[requestedType] = {
      messageName: requestedType,
      fields: [
        {
          name: declaration.name.getText(file),
          fieldValue: getFieldValueFromType(declaration.type),
        },
      ],
    };
    continue;
  }

  throw new Error(`unexpected declaration for ${requestedType}`);
}
var str = JSON.stringify(messages, null, 2);
console.log(str);
