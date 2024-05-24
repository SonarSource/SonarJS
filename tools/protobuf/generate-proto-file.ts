import ts, { InterfaceDeclaration, TypeNode, isPropertySignature } from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const packageJson = require(path.join('..', '..', 'package.json'));
const typesVersion = packageJson.devDependencies['@types/estree'];

const TOP_LEVEL_NODE = 'BaseNodeWithoutComments';

const ignoredMembers: Set<string> = new Set([
  // The "type" member is redundant in our context.
  'type',
  'comments',
  'innerComments',
]);

// Some types follow a different structure than the others, instead of adding special logic for them, we create them manually.
const handWrittenTypes: Set<string> = new Set([
  // RegExpLiteral declare RegExp, wich we can not map to Protobuf type.
  'RegExpLiteral',
  // TemplateElement is not following the common structure of the other nodes.
  'TemplateElement',
]);

// Types representing Protobuf messages.
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

const typesPath = path.join('..', '..', 'node_modules', '@types', 'estree', 'index.d.ts');
const file = ts.createSourceFile(
  typesPath,
  fs.readFileSync(typesPath, 'utf-8'),
  ts.ScriptTarget.ESNext,
);
const declarations: Record<string, Declaration> = declarationsFromFile(file);
const messages = getProtobufMessagesFromDeclarations(declarations);
addHandWrittenMessages(messages);
writeMessagesToFile(messages);

function declarationsFromFile(file: ts.SourceFile) {
  const declarations: Record<string, Declaration> = {};
  for (const statement of file.statements) {
    // The "index.d.ts" file contains only interfaces and type aliases.
    const declaration = statement as Declaration;
    declarations[declaration.name.getText(file)] = declaration;
  }
  return declarations;
}

function getProtobufMessagesFromDeclarations(declarations: Record<string, Declaration>) {
  const messages: Record<string, ProtobufMessage> = {};

  const requestedTypes: string[] = ['Program'];
  while (requestedTypes.length) {
    const requestedType = requestedTypes.pop()!;
    const declaration = declarations[requestedType];

    if (!declaration) {
      console.log('Missing declaration for', requestedType);
      continue;
    }

    if (ts.isInterfaceDeclaration(declaration)) {
      const typeHierarchy = extractTypeHierarchy(declaration).reverse();

      let messageFields: ProtobufMessageField[] = [];
      for (const currentType of typeHierarchy) {
        const currentDeclaration = declarations[currentType] as InterfaceDeclaration;
        const currentFields = getFieldValues(currentDeclaration, messageFields);
        messageFields = messageFields.concat(currentFields);
      }

      messages[requestedType] = {
        messageName: requestedType,
        fields: messageFields,
      };
    } else if (ts.isTypeAliasDeclaration(declaration)) {
      messages[requestedType] = {
        messageName: requestedType,
        fields: [
          {
            name: lowerCaseFirstLetter(declaration.name.getText(file)),
            fieldValue: getFieldValueFromType(declaration.type),
          },
        ],
      };
    } else {
      throw new Error(`Unexpected declaration for ${requestedType}`);
    }
  }

  function requestType(type: string) {
    if (!(type in messages) && !requestedTypes.includes(type) && !handWrittenTypes.has(type)) {
      requestedTypes.push(type);
    }

    return { type };
  }

  function getFieldValues(
    declaration: InterfaceDeclaration,
    messageFields: ProtobufMessageField[],
  ) {
    return declaration.members
      .filter(isPropertySignature)
      .filter(signature => signature.type && !ignoredMembers.has(signature.name.getText(file)))
      .filter(signature => !isAlreadyThere(messageFields, signature))
      .map(signature => {
        return {
          name: signature.name.getText(file),
          fieldValue: getFieldValueFromType(signature.type as TypeNode),
        };
      });
  }

  function getFieldValueFromType(typeNode: TypeNode): ProtobufFieldValue {
    // The type is of shape "A[]", we want to generate repeated A
    if (ts.isArrayTypeNode(typeNode)) {
      return {
        repeatedValue: flattenRepeatedNodeInOneOf(getFieldValueFromType(typeNode.elementType)),
      };
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
        return {
          repeatedValue: flattenRepeatedNodeInOneOf(
            getFieldValueFromType(typeNode.typeArguments[0]),
          ),
        };
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
    throw new Error(`Cannot generate Protobuf field Value for typeNode ${typeNode.getText(file)}`);
  }

  return messages;
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

function flattenRepeatedNodeInOneOf(field: ProtobufFieldValue): ProtobufFieldValue {
  // Protobuf does not support oneof with repeated fields, so we need to flatten them.
  if ('oneOfElements' in field) {
    // We naively put the value to be a Top Level Node. We loose a bit of compiler safety check
    // (example: "Literal | Identifier" will be flattened to a Top Level Node, meaning that one could put any "Expression" in it, which is not correct)
    // but it is a tradeoff we are willing to make for now.
    return { type: TOP_LEVEL_NODE };
  }
  return field;
}

/**
 * Returns the type hierarchy from top to bottom
 * Example: [BaseStatement, BaseForXStatement, ForInStatement]
 */
function extractTypeHierarchy(declaration: InterfaceDeclaration): string[] {
  const inheritedTypes = declaration?.heritageClauses
    ?.flatMap(hc => hc.types)
    ?.flatMap(t => {
      const typeName = t.getText(file);
      const parentDeclaration = declarations[t.getText(file)];
      // We stop at BaseNode, we will handle it manually.
      if (parentDeclaration && typeName !== 'BaseNode') {
        return extractTypeHierarchy(parentDeclaration as InterfaceDeclaration);
      }
      return [];
    });
  const ret: string[] = inheritedTypes || [];
  ret.push(declaration.name.getText(file));
  return ret;
}

function isAlreadyThere(
  messageFields: { name: string; fieldValue: ProtobufFieldValue }[],
  signature: ts.PropertySignature,
) {
  for (const field of messageFields) {
    if (field.name === signature.name.getText(file)) {
      return true;
    }
  }
  return false;
}

function addHandWrittenMessages(messages: Record<string, ProtobufMessage>) {
  // Create node manually for 'RegExpLiteral' and 'TemplateElement'.
  messages['RegExpLiteral'] = {
    messageName: 'RegExpLiteral',
    fields: [
      { name: 'pattern', fieldValue: { type: 'string' } },
      { name: 'flags', fieldValue: { type: 'string' } },
      { name: 'raw', fieldValue: { type: 'string' } },
    ],
  };

  messages['TemplateElement'] = {
    messageName: 'TemplateElement',
    fields: [
      { name: 'tail', fieldValue: { type: 'bool' } },
      { name: 'cooked', fieldValue: { type: 'string' } },
      { name: 'raw', fieldValue: { type: 'string' } },
    ],
  };

  // We create manually the top level node "BaseNodeWithoutComments", holding all the other nodes. The name is taken directly from the index.d.ts file.
  // While we could generate this node with the same logic as the one used for all nodes, we do it manually as there would be too many edge cases to handle.
  const allNodeTypesAsFields = Object.keys(messages).map(nodeType => {
    return { name: lowerCaseFirstLetter(nodeType), fieldValue: { type: nodeType } };
  });
  messages[TOP_LEVEL_NODE] = {
    messageName: TOP_LEVEL_NODE,
    fields: [
      { name: 'type', fieldValue: { type: 'string' } },
      // SourceLocation will be generated by the logic.
      { name: 'loc', fieldValue: { type: 'SourceLocation' } },
      { name: 'node', fieldValue: { oneOfElements: allNodeTypesAsFields } },
    ],
  };

  messages['SourceLocation'] = {
    messageName: 'SourceLocation',
    fields: [
      { name: 'source', fieldValue: { type: 'string' } },
      // SourceLocation will be generated by the logic.
      { name: 'start', fieldValue: { type: 'Position' } },
      { name: 'end', fieldValue: { type: 'Position' } },
    ],
  };

  messages['Position'] = {
    messageName: 'Position',
    fields: [
      { name: 'line', fieldValue: { type: 'int32' } },
      { name: 'end', fieldValue: { type: 'int32' } },
    ],
  };
}

function writeMessagesToFile(messages: Record<string, ProtobufMessage>) {
  fs.mkdirSync('output', { recursive: true });
  fs.writeFileSync(path.join('output', 'ast.proto'), addPrefix(translateToProtoFormat(messages)));
  /**
   * Translate the messages to a protobuf file format.
   */
  function translateToProtoFormat(messages: Record<string, ProtobufMessage>): string {
    const lines: string[] = [];
    let index = 1;
    for (const message of Object.values(messages)) {
      lines.push(`message ${message.messageName} {`);
      for (const field of message.fields) {
        if ('repeatedValue' in field.fieldValue) {
          lines.push(
            `  repeated ${(field.fieldValue.repeatedValue as ProtobufPrimitiveFieldValue).type} ${field.name} = ${index};`,
          );
        } else if ('oneOfElements' in field.fieldValue) {
          lines.push(`  oneof ${field.name} {`);
          for (const oneOfField of field.fieldValue.oneOfElements) {
            lines.push(
              `    ${(oneOfField.fieldValue as ProtobufPrimitiveFieldValue).type} ${field.name}_${oneOfField.name} = ${index};`,
            );
            index++;
          }
          lines.push('  }');
          index--;
        } else {
          lines.push(`  ${field.fieldValue.type} ${field.name} = ${index};`);
        }
        index++;
      }
      lines.push('}');
    }
    return lines.join('\n');
  }

  function addPrefix(protoData: string) {
    return `syntax = "proto3";\n// Generated for @types/estree version: ${typesVersion}\n\n${protoData}`;
  }
}
