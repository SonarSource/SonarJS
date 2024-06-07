import ts from 'typescript';

// Types representing Protobuf messages.
export type ESTreeNode = {
  name: string;
  fields: NodeField[];
};

export type NodeField = {
  name: string;
  fieldValue: NodeFieldValue;
};

export type NodeFieldValue = PrimitiveFieldValue | ArrayLikeFieldValue | UnionFieldValue;

export type PrimitiveFieldValue = {
  type: string;
};

export type ArrayLikeFieldValue = {
  elementValue: NodeFieldValue;
};

export type UnionFieldValue = {
  unionElements: NodeField[];
};

export type Declaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

export const TOP_LEVEL_NODE = 'BaseNodeWithoutComments';

const IGNORED_MEMBERS: Set<string> = new Set([
  // The "type" member is redundant in our context.
  'type',
  'comments',
  'innerComments',
]);

// Some types follow a different structure than the others, instead of adding special logic for them, we create them manually.
const HAND_WRITTEN_TYPES: Set<string> = new Set([
  // RegExpLiteral declare RegExp, wich we can not map to Protobuf type.
  'RegExpLiteral',
  // TemplateElement is not following the common structure of the other nodes.
  'TemplateElement',
]);

export function getEstreeNodes(file: ts.SourceFile) {
  const declarations = declarationsFromFile(file);

  const messages: Record<string, ESTreeNode> = {};

  // Create node manually for 'RegExpLiteral' and 'TemplateElement'.
  messages['RegExpLiteral'] = {
    name: 'RegExpLiteral',
    fields: [
      { name: 'pattern', fieldValue: { type: 'string' } },
      { name: 'flags', fieldValue: { type: 'string' } },
      { name: 'raw', fieldValue: { type: 'string' } },
    ],
  };

  messages['TemplateElement'] = {
    name: 'TemplateElement',
    fields: [
      { name: 'tail', fieldValue: { type: 'bool' } },
      { name: 'cooked', fieldValue: { type: 'string' } },
      { name: 'raw', fieldValue: { type: 'string' } },
    ],
  };

  const requestedTypes: string[] = ['Program'];
  while (requestedTypes.length) {
    const requestedType = requestedTypes.pop()!;
    const declaration = declarations[requestedType];

    if (!declaration) {
      console.log('Missing declaration for', requestedType);
      continue;
    }

    if (ts.isInterfaceDeclaration(declaration)) {
      const typeHierarchy = extractTypeHierarchy(declaration, file, declarations).reverse();

      let messageFields: NodeField[] = [];
      for (const currentType of typeHierarchy) {
        const currentDeclaration = declarations[currentType] as ts.InterfaceDeclaration;
        const currentFields = getFieldValues(currentDeclaration, messageFields, file);
        messageFields = messageFields.concat(currentFields);
      }

      messages[requestedType] = {
        name: requestedType,
        fields: messageFields,
      };
    } else if (ts.isTypeAliasDeclaration(declaration)) {
      messages[requestedType] = {
        name: requestedType,
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

  function requestType(type: string): PrimitiveFieldValue {
    if (!(type in messages) && !requestedTypes.includes(type) && !HAND_WRITTEN_TYPES.has(type)) {
      requestedTypes.push(type);
    }

    return { type };
  }

  function getFieldValues(
    declaration: ts.InterfaceDeclaration,
    messageFields: NodeField[],
    file: ts.SourceFile,
  ) {
    return declaration.members
      .filter(ts.isPropertySignature)
      .filter(signature => signature.type && !IGNORED_MEMBERS.has(signature.name.getText(file)))
      .filter(signature => !isAlreadyThere(messageFields, signature, file))
      .map(signature => {
        return {
          name: signature.name.getText(file),
          fieldValue: getFieldValueFromType(signature.type as ts.TypeNode),
        };
      });
  }

  function getFieldValueFromType(typeNode: ts.TypeNode): NodeFieldValue {
    // The type is of shape "A[]", we want to generate repeated A
    if (ts.isArrayTypeNode(typeNode)) {
      return {
        elementValue: flattenRepeatedNodeInOneOf(getFieldValueFromType(typeNode.elementType)),
      };
    }

    // The type is of shape "A | B", we want to generate oneof name {A a, B b}
    if (ts.isUnionTypeNode(typeNode)) {
      if (typeNode.types.every(t => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal))) {
        // Case similar to "kind: "init" | "get" | "set";".
        // In this case, we don't want to create one field per alternative, it is enough to create one single string field of type string.
        // Note that we loose the potential exhaustiveness compiler check, but adding more code to have this feature is currently overkill compared to the usefulness.
        return { type: 'string' };
      }

      const interestingTypes = typeNode.types
        // We don't need to explicitly say that a value can be undefined or null, if it is the case during serialization, we will simply not put anything.
        .filter(t => !isNullOrUndefined(t));

      if (interestingTypes.length === 1) {
        return getFieldValueFromType(interestingTypes[0]);
      }

      return {
        unionElements: interestingTypes.map(t => {
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
          elementValue: getFieldValueFromType(typeNode.typeArguments[0]),
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
        unionElements: keyOfDeclaration.members
          .filter(ts.isPropertySignature)
          .filter(signature => signature.type)
          .map(s => {
            return {
              name: lowerCaseFirstLetter((s.type as ts.TypeNode).getText(file)),
              fieldValue: getFieldValueFromType(s.type as ts.TypeNode),
            };
          }),
      };
    }
    throw new Error(`Cannot generate Protobuf field Value for typeNode ${typeNode.getText(file)}`);
  }

  return messages;
}

function declarationsFromFile(file: ts.SourceFile) {
  const declarations: Record<string, Declaration> = {};
  for (const statement of file.statements) {
    // The "index.d.ts" file contains only interfaces and type aliases.
    const declaration = statement as Declaration;
    declarations[declaration.name.getText(file)] = declaration;
  }
  return declarations;
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

function flattenRepeatedNodeInOneOf(field: NodeFieldValue): NodeFieldValue {
  // Protobuf does not support oneof with repeated fields, so we need to flatten them.
  if ('unionElements' in field) {
    // We naively put the value to be a Top Level Node. We loose a bit of compiler safety check
    // (example: "Literal | Identifier" will be flattened to a Top Level Node, meaning that one could put any "Expression" in it, which is not correct)
    // but it is a tradeoff we are willing to make for now.
    return { type: TOP_LEVEL_NODE };
  }
  return field;
}

function isAlreadyThere(
  messageFields: { name: string; fieldValue: NodeFieldValue }[],
  signature: ts.PropertySignature,
  file: ts.SourceFile,
) {
  for (const field of messageFields) {
    if (field.name === signature.name.getText(file)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the type hierarchy from top to bottom
 * Example: [BaseStatement, BaseForXStatement, ForInStatement]
 */
function extractTypeHierarchy(
  declaration: ts.InterfaceDeclaration,
  file: ts.SourceFile,
  declarations: Record<string, Declaration>,
): string[] {
  const inheritedTypes = declaration?.heritageClauses
    ?.flatMap(hc => hc.types)
    ?.flatMap(t => {
      const typeName = t.getText(file);
      const parentDeclaration = declarations[t.getText(file)];
      // We stop at BaseNode, we will handle it manually.
      if (parentDeclaration && typeName !== 'BaseNode') {
        return extractTypeHierarchy(
          parentDeclaration as ts.InterfaceDeclaration,
          file,
          declarations,
        );
      }
      return [];
    });
  const ret: string[] = inheritedTypes || [];
  ret.push(declaration.name.getText(file));
  return ret;
}

export function lowerCaseFirstLetter(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
