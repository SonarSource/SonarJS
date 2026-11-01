/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
const { SyntaxKind: K, ModifierFlags: M, NodeFlags } = require('./constants.json');
const modifierFlags = new Map(
  Object.entries(M).flatMap(([name, flag]) => {
    const kind = K[`${name}Keyword`];
    return typeof flag === 'number' && kind !== undefined ? [[kind, flag]] : [];
  }),
);
function getModifiers(node) {
  const modifiers = node.modifiers?.filter(modifier => modifier.kind !== K.Decorator);
  return modifiers?.length ? modifiers : undefined;
}
function getDecorators(node) {
  const decorators = node.modifiers?.filter(modifier => modifier.kind === K.Decorator);
  return decorators?.length ? decorators : undefined;
}
function getCombinedModifierFlags(node) {
  let flags = 0;
  for (const modifier of node.modifiers ?? []) flags |= modifierFlags.get(modifier.kind) ?? 0;
  if (
    [K.VariableDeclaration, K.BindingElement, K.VariableDeclarationList].includes(node.kind) &&
    node.parent
  ) {
    flags |= getCombinedModifierFlags(node.parent);
  }
  return flags;
}
const hasSyntacticModifier = (node, flags) => (getCombinedModifierFlags(node) & flags) !== 0;
function getNameOfDeclaration(node) {
  if (!node) return undefined;
  if (node.name) return node.name;
  const parent = node.parent;
  if ([K.FunctionExpression, K.ArrowFunction, K.ClassExpression].includes(node.kind)) {
    if ([K.VariableDeclaration, K.PropertyAssignment, K.BindingElement].includes(parent?.kind))
      return parent.name;
    if (parent?.kind === K.BinaryExpression) return parent.left.name ?? parent.left;
  }
  return undefined;
}
function skipPartiallyEmittedExpressions(node) {
  while (node.kind === K.PartiallyEmittedExpression) node = node.expression;
  return node;
}
// JSDoc attached to a single-variable statement also belongs to its declaration
// and identifier. Do not inherit documentation from an enclosing function/block.
function getJSDocType(node) {
  for (let current = node; current;) {
    const tag = current.jsDoc
      ?.flatMap(doc => doc.tags ?? [])
      .find(tag => tag.kind === K.JSDocTypeTag);
    if (tag?.typeExpression?.type) return tag.typeExpression.type;
    const parent = current.parent;
    if (
      (parent?.kind === K.VariableDeclaration && parent.name === current) ||
      (parent?.kind === K.VariableDeclarationList && parent.declarations.length === 1) ||
      (parent?.kind === K.VariableStatement && current.kind === K.VariableDeclarationList)
    ) {
      current = parent;
    } else return undefined;
  }
}
module.exports = {
  getModifiers,
  getDecorators,
  getCombinedModifierFlags,
  hasSyntacticModifier,
  hasAbstractModifier: node => hasSyntacticModifier(node, M.Abstract),
  getNameOfDeclaration,
  skipPartiallyEmittedExpressions,
  getJSDocType,
  declarationNameToString: name => name?.getText?.() ?? name?.text ?? '(Missing)',
  forEachChild: (node, visitor, visitArray) => node?.forEachChild(visitor, visitArray),
  factory: {
    createIdentifier: text => ({
      kind: K.Identifier,
      text,
      escapedText: text.startsWith('__') ? `_${text}` : text,
      pos: -1,
      end: -1,
      flags: NodeFlags.Synthesized,
    }),
  },
};
