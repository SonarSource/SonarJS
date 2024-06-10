/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import java.util.List;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.SourceLocation;

public class ESTreeFactory {

  private ESTreeFactory() {
    // Utility class
  }

  public static <T> T from(Node node, Class<T> clazz) {
    ESTree.Node estreeNode = switch (node.getType()) {
      case ProgramType -> fromProgramType(node);
      case ExportAllDeclarationType -> fromExportAllDeclarationType(node);
      case IdentifierType -> fromIdentifierType(node);
      case ExportDefaultDeclarationType -> fromExportDefaultDeclarationType(node);
      case YieldExpressionType -> fromYieldExpressionType(node);
      case UpdateExpressionType -> fromUpdateExpressionType(node);
      case UnaryExpressionType -> fromUnaryExpressionType(node);
      case ThisExpressionType -> fromThisExpressionType(node);
      case TemplateLiteralType -> fromTemplateLiteralType(node);
      case TaggedTemplateExpressionType -> fromTaggedTemplateExpressionType(node);
      case SequenceExpressionType -> fromSequenceExpressionType(node);
      case ObjectExpressionType -> fromObjectExpressionType(node);
      case SpreadElementType -> fromSpreadElementType(node);
      case PropertyType -> fromPropertyType(node);
      case AssignmentPatternType -> fromAssignmentPatternType(node);
      case RestElementType -> fromRestElementType(node);
      case ArrayPatternType -> fromArrayPatternType(node);
      case ObjectPatternType -> fromObjectPatternType(node);
      case PrivateIdentifierType -> fromPrivateIdentifierType(node);
      case NewExpressionType -> fromNewExpressionType(node);
      case SuperType -> fromSuperType(node);
      case MetaPropertyType -> fromMetaPropertyType(node);
      case MemberExpressionType -> fromMemberExpressionType(node);
      case LogicalExpressionType -> fromLogicalExpressionType(node);
      case ImportExpressionType -> fromImportExpressionType(node);
      case BlockStatementType -> fromBlockStatementType(node);
      case ConditionalExpressionType -> fromConditionalExpressionType(node);
      case ClassExpressionType -> fromClassExpressionType(node);
      case ClassBodyType -> fromClassBodyType(node);
      case StaticBlockType -> fromStaticBlockType(node);
      case PropertyDefinitionType -> fromPropertyDefinitionType(node);
      case MethodDefinitionType -> fromMethodDefinitionType(node);
      case ChainExpressionType -> fromChainExpressionType(node);
      case CallExpressionType -> fromCallExpressionType(node);
      case BinaryExpressionType -> fromBinaryExpressionType(node);
      case AwaitExpressionType -> fromAwaitExpressionType(node);
      case AssignmentExpressionType -> fromAssignmentExpressionType(node);
      case ArrowFunctionExpressionType -> fromArrowFunctionExpressionType(node);
      case ArrayExpressionType -> fromArrayExpressionType(node);
      case ClassDeclarationType -> fromClassDeclarationType(node);
      case FunctionDeclarationType -> fromFunctionDeclarationType(node);
      case ExportNamedDeclarationType -> fromExportNamedDeclarationType(node);
      case ExportSpecifierType -> fromExportSpecifierType(node);
      case VariableDeclarationType -> fromVariableDeclarationType(node);
      case VariableDeclaratorType -> fromVariableDeclaratorType(node);
      case ImportDeclarationType -> fromImportDeclarationType(node);
      case ImportNamespaceSpecifierType -> fromImportNamespaceSpecifierType(node);
      case ImportDefaultSpecifierType -> fromImportDefaultSpecifierType(node);
      case ImportSpecifierType -> fromImportSpecifierType(node);
      case ForOfStatementType -> fromForOfStatementType(node);
      case ForInStatementType -> fromForInStatementType(node);
      case ForStatementType -> fromForStatementType(node);
      case DoWhileStatementType -> fromDoWhileStatementType(node);
      case WhileStatementType -> fromWhileStatementType(node);
      case TryStatementType -> fromTryStatementType(node);
      case CatchClauseType -> fromCatchClauseType(node);
      case ThrowStatementType -> fromThrowStatementType(node);
      case SwitchStatementType -> fromSwitchStatementType(node);
      case SwitchCaseType -> fromSwitchCaseType(node);
      case IfStatementType -> fromIfStatementType(node);
      case ContinueStatementType -> fromContinueStatementType(node);
      case BreakStatementType -> fromBreakStatementType(node);
      case LabeledStatementType -> fromLabeledStatementType(node);
      case ReturnStatementType -> fromReturnStatementType(node);
      case WithStatementType -> fromWithStatementType(node);
      case DebuggerStatementType -> fromDebuggerStatementType(node);
      case EmptyStatementType -> fromEmptyStatementType(node);
      case ExpressionStatementType -> fromExpressionStatementType(node);
      case LiteralType -> fromLiteralType(node);
      case TemplateElementType -> fromTemplateElementType(node);
      case FunctionExpressionType -> fromFunctionExpressionType(node);
      case UNRECOGNIZED ->
        throw new IllegalArgumentException("Unknown node type: " + node.getType() + " at " + node.getLoc());
    };
    return clazz.cast(estreeNode);
  }

  private static <T> List<T> from(List<Node> bodyList, Class<T> clazz) {
    return bodyList.stream().map(n -> from(n, clazz)).toList();
  }


  private static ESTree.Location fromLocation(SourceLocation location) {
    return new ESTree.Location(new ESTree.Position(location.getStart().getLine(), location.getStart().getColumn()),
      new ESTree.Position(location.getEnd().getLine(), location.getEnd().getColumn()));
  }


  private static ESTree.Program fromProgramType(Node node) {
    return new ESTree.Program(fromLocation(node.getLoc()),
      node.getProgram().getSourceType(),
      from(node.getProgram().getBodyList(), ESTree.DirectiveOrModuleDeclarationOrStatement.class));
  }

  private static ESTree.ExportAllDeclaration fromExportAllDeclarationType(Node node) {
    return new ESTree.ExportAllDeclaration(fromLocation(node.getLoc()),
      from(node.getExportAllDeclaration().getExported(), ESTree.Identifier.class),
      from(node.getExportAllDeclaration().getSource(), ESTree.Literal.class));
  }

  private static ESTree.Identifier fromIdentifierType(Node node) {
    return new ESTree.Identifier(fromLocation(node.getLoc()), node.getIdentifier().getName());
  }

  private static ESTree.ExportDefaultDeclaration fromExportDefaultDeclarationType(Node node) {
    return new ESTree.ExportDefaultDeclaration(fromLocation(node.getLoc()),
      from(node.getExportDefaultDeclaration().getDeclaration(), ESTree.Expression.class));
  }

  private static ESTree.YieldExpression fromYieldExpressionType(Node node) {
    return new ESTree.YieldExpression(fromLocation(node.getLoc()),
      from(node.getYieldExpression().getArgument(), ESTree.Expression.class),
      node.getYieldExpression().getDelegate());
  }

  private static ESTree.UpdateExpression fromUpdateExpressionType(Node node) {
    return new ESTree.UpdateExpression(fromLocation(node.getLoc()),
      ESTree.UpdateOperator.valueOf(node.getUpdateExpression().getOperator()),
      from(node.getUpdateExpression().getArgument(), ESTree.Expression.class),
      node.getUpdateExpression().getPrefix());
  }

  private static ESTree.UnaryExpression fromUnaryExpressionType(Node node) {
    return new ESTree.UnaryExpression(fromLocation(node.getLoc()),
      ESTree.UnaryOperator.valueOf(node.getUnaryExpression().getOperator()),
      node.getUnaryExpression().getPrefix(),
      from(node.getUnaryExpression().getArgument(), ESTree.Expression.class));
  }

  private static ESTree.ThisExpression fromThisExpressionType(Node node) {
    return new ESTree.ThisExpression(fromLocation(node.getLoc()));
  }

  private static ESTree.TemplateLiteral fromTemplateLiteralType(Node node) {
    return new ESTree.TemplateLiteral(fromLocation(node.getLoc()),
      from(node.getTemplateLiteral().getQuasisList(), ESTree.TemplateElement.class),
      from(node.getTemplateLiteral().getExpressionsList(), ESTree.Expression.class));
  }

  private static ESTree.TaggedTemplateExpression fromTaggedTemplateExpressionType(Node node) {
    return new ESTree.TaggedTemplateExpression(fromLocation(node.getLoc()),
      from(node.getTaggedTemplateExpression().getTag(), ESTree.Expression.class),
      from(node.getTaggedTemplateExpression().getQuasi(), ESTree.TemplateLiteral.class));
  }

  private static ESTree.SequenceExpression fromSequenceExpressionType(Node node) {
    return new ESTree.SequenceExpression(fromLocation(node.getLoc()),
      from(node.getSequenceExpression().getExpressionsList(), ESTree.Expression.class));
  }

  private static ESTree.ObjectExpression fromObjectExpressionType(Node node) {
    return new ESTree.ObjectExpression(fromLocation(node.getLoc()),
      from(node.getObjectExpression().getPropertiesList(), ESTree.PropertyOrSpreadElement.class));
  }

  private static ESTree.SpreadElement fromSpreadElementType(Node node) {
    return new ESTree.SpreadElement(fromLocation(node.getLoc()),
      from(node.getSpreadElement().getArgument(), ESTree.Expression.class));
  }

  private static ESTree.Property fromPropertyType(Node node) {
    return new ESTree.Property(fromLocation(node.getLoc()),
      from(node.getProperty().getKey(), ESTree.Expression.class),
      from(node.getProperty().getValue(), ESTree.Expression.class),
      node.getProperty().getKind(),
      node.getProperty().getMethod(),
      node.getProperty().getShorthand(),
      node.getProperty().getComputed());
  }

  private static ESTree.AssignmentPattern fromAssignmentPatternType(Node node) {
    return new ESTree.AssignmentPattern(fromLocation(node.getLoc()),
      from(node.getAssignmentPattern().getLeft(), ESTree.Pattern.class),
      from(node.getAssignmentPattern().getRight(), ESTree.Expression.class));
  }

  private static ESTree.RestElement fromRestElementType(Node node) {
    return new ESTree.RestElement(fromLocation(node.getLoc()),
      from(node.getRestElement().getArgument(), ESTree.Pattern.class));
  }

  private static ESTree.ArrayPattern fromArrayPatternType(Node node) {
    return new ESTree.ArrayPattern(fromLocation(node.getLoc()),
      from(node.getArrayPattern().getElementsList(), ESTree.Pattern.class));
  }

  private static ESTree.ObjectPattern fromObjectPatternType(Node node) {
    return new ESTree.ObjectPattern(fromLocation(node.getLoc()),
      from(node.getObjectPattern().getPropertiesList(), ESTree.AssignmentPropertyOrRestElement.class));
  }

  private static ESTree.PrivateIdentifier fromPrivateIdentifierType(Node node) {
    return new ESTree.PrivateIdentifier(fromLocation(node.getLoc()),
      node.getPrivateIdentifier().getName());
  }

  private static ESTree.NewExpression fromNewExpressionType(Node node) {
    return new ESTree.NewExpression(fromLocation(node.getLoc()),
      from(node.getNewExpression().getCallee(), ESTree.Expression.class),
      from(node.getNewExpression().getArgumentsList(), ESTree.ExpressionOrSpreadElement.class));
  }

  private static ESTree.Super fromSuperType(Node node) {
    return new ESTree.Super(fromLocation(node.getLoc()));
  }

  private static ESTree.MetaProperty fromMetaPropertyType(Node node) {
    return new ESTree.MetaProperty(fromLocation(node.getLoc()),
      from(node.getMetaProperty().getMeta(), ESTree.Identifier.class),
      from(node.getMetaProperty().getProperty(), ESTree.Identifier.class));
  }

  private static ESTree.MemberExpression fromMemberExpressionType(Node node) {
    return new ESTree.MemberExpression(fromLocation(node.getLoc()),
      from(node.getMemberExpression().getObject(),
      ESTree.ExpressionOrSuper.class), from(node.getMemberExpression().getProperty(), ESTree.ExpressionOrPrivateIdentifier.class),
      node.getMemberExpression().getComputed(), node.getMemberExpression().getOptional());
  }

  private static ESTree.LogicalExpression fromLogicalExpressionType(Node node) {
    return new ESTree.LogicalExpression(fromLocation(node.getLoc()),
      ESTree.LogicalOperator.valueOf(node.getLogicalExpression().getOperator()),
      from(node.getLogicalExpression().getLeft(), ESTree.Expression.class),
      from(node.getLogicalExpression().getRight(), ESTree.Expression.class));
  }

  private static ESTree.ImportExpression fromImportExpressionType(Node node) {
    return new ESTree.ImportExpression(fromLocation(node.getLoc()),
      from(node.getImportExpression().getSource(), ESTree.Expression.class));
  }

  private static ESTree.BlockStatement fromBlockStatementType(Node node) {
    return new ESTree.BlockStatement(fromLocation(node.getLoc()),
      from(node.getBlockStatement().getBodyList(), ESTree.Statement.class));
  }

  private static ESTree.ConditionalExpression fromConditionalExpressionType(Node node) {
    return new ESTree.ConditionalExpression(fromLocation(node.getLoc()),
      from(node.getConditionalExpression().getTest(), ESTree.Expression.class),
      from(node.getConditionalExpression().getAlternate(), ESTree.Expression.class),
      from(node.getConditionalExpression().getConsequent(), ESTree.Expression.class));
  }

  private static ESTree.ClassExpression fromClassExpressionType(Node node) {
    return new ESTree.ClassExpression(fromLocation(node.getLoc()),
      from(node.getClassExpression().getId(), ESTree.Identifier.class),
      from(node.getClassExpression().getSuperClass(), ESTree.Expression.class),
      from(node.getClassExpression().getBody(), ESTree.ClassBody.class));
  }

  private static ESTree.ClassBody fromClassBodyType(Node node) {
    return new ESTree.ClassBody(fromLocation(node.getLoc()),
      from(node.getClassBody().getBodyList(), ESTree.MethodDefinitionOrPropertyDefinitionOrStaticBlock.class));
  }

  private static ESTree.StaticBlock fromStaticBlockType(Node node) {
    return new ESTree.StaticBlock(fromLocation(node.getLoc()));
  }

  private static ESTree.PropertyDefinition fromPropertyDefinitionType(Node node) {
    return new ESTree.PropertyDefinition(fromLocation(node.getLoc()),
      from(node.getPropertyDefinition().getKey(), ESTree.Expression.class),
      from(node.getPropertyDefinition().getValue(), ESTree.Expression.class),
      node.getPropertyDefinition().getComputed(),
      node.getPropertyDefinition().getStatic());
  }

  private static ESTree.MethodDefinition fromMethodDefinitionType(Node node) {
    return new ESTree.MethodDefinition(fromLocation(node.getLoc()), from(node.getMethodDefinition().getKey(), ESTree.Expression.class),
      from(node.getMethodDefinition().getValue(), ESTree.FunctionExpression.class), node.getMethodDefinition().getKind(),
      node.getMethodDefinition().getComputed(), node.getMethodDefinition().getStatic());
  }

  private static ESTree.ChainExpression fromChainExpressionType(Node node) {
    return new ESTree.ChainExpression(fromLocation(node.getLoc()),
      from(node.getChainExpression().getExpression(), ESTree.ChainElement.class));
  }

  private static ESTree.CallExpression fromCallExpressionType(Node node) {
    return new ESTree.SimpleCallExpression(fromLocation(node.getLoc()),
      node.getCallExpression().getOptional(),
      from(node.getCallExpression().getCallee(), ESTree.ExpressionOrSuper.class),
      from(node.getCallExpression().getArgumentsList(), ESTree.ExpressionOrSpreadElement.class));
  }

  private static ESTree.BinaryExpression fromBinaryExpressionType(Node node) {
    return new ESTree.BinaryExpression(fromLocation(node.getLoc()),
      ESTree.BinaryOperator.valueOf(node.getBinaryExpression().getOperator()),
      from(node.getBinaryExpression().getLeft(), ESTree.Expression.class),
      from(node.getBinaryExpression().getRight(), ESTree.Expression.class));
  }

  private static ESTree.AwaitExpression fromAwaitExpressionType(Node node) {
    return new ESTree.AwaitExpression(fromLocation(node.getLoc()),
      from(node.getAwaitExpression().getArgument(), ESTree.Expression.class));
  }

  private static ESTree.AssignmentExpression fromAssignmentExpressionType(Node node) {
    return new ESTree.AssignmentExpression(fromLocation(node.getLoc()),
      ESTree.AssignmentOperator.valueOf(node.getAssignmentExpression().getOperator()),
      from(node.getAssignmentExpression().getLeft(), ESTree.Pattern.class),
      from(node.getAssignmentExpression().getRight(), ESTree.Expression.class));
  }

  private static ESTree.ArrowFunctionExpression fromArrowFunctionExpressionType(Node node) {
    return new ESTree.ArrowFunctionExpression(fromLocation(node.getLoc()),
      node.getArrowFunctionExpression().getExpression(),
      from(node.getArrowFunctionExpression().getBody(), ESTree.BlockStatementOrExpression.class),
      from(node.getArrowFunctionExpression().getParamsList(), ESTree.Pattern.class),
      node.getArrowFunctionExpression().getGenerator(),
      node.getArrowFunctionExpression().getAsync());
  }

  private static ESTree.ArrayExpression fromArrayExpressionType(Node node) {
    return new ESTree.ArrayExpression(fromLocation(node.getLoc()),
      from(node.getArrayExpression().getElementsList(), ESTree.ExpressionOrSpreadElement.class));
  }

  private static ESTree.ClassDeclaration fromClassDeclarationType(Node node) {
    return new ESTree.ClassDeclaration(fromLocation(node.getLoc()),
      from(node.getClassDeclaration().getId(), ESTree.Identifier.class),
      from(node.getClassDeclaration().getSuperClass(), ESTree.Expression.class),
      from(node.getClassDeclaration().getBody(), ESTree.ClassBody.class));
  }

  private static ESTree.FunctionDeclaration fromFunctionDeclarationType(Node node) {
    return new ESTree.FunctionDeclaration(fromLocation(node.getLoc()),
      from(node.getFunctionDeclaration().getId(), ESTree.Identifier.class),
      from(node.getFunctionDeclaration().getBody(), ESTree.BlockStatement.class),
      from(node.getFunctionDeclaration().getParamsList(), ESTree.Pattern.class),
      node.getFunctionDeclaration().getGenerator(),
      node.getFunctionDeclaration().getAsync());
  }

  private static ESTree.ExportNamedDeclaration fromExportNamedDeclarationType(Node node) {
    return new ESTree.ExportNamedDeclaration(fromLocation(node.getLoc()),
      from(node.getExportNamedDeclaration().getDeclaration(), ESTree.Declaration.class),
      from(node.getExportNamedDeclaration().getSpecifiersList(), ESTree.ExportSpecifier.class),
      from(node.getExportNamedDeclaration().getSource(), ESTree.Literal.class));
  }

  private static ESTree.ExportSpecifier fromExportSpecifierType(Node node) {
    return new ESTree.ExportSpecifier(fromLocation(node.getLoc()),
      from(node.getExportSpecifier().getExported(), ESTree.Identifier.class),
      from(node.getExportSpecifier().getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.VariableDeclaration fromVariableDeclarationType(Node node) {
    return new ESTree.VariableDeclaration(fromLocation(node.getLoc()),
      from(node.getVariableDeclaration().getDeclarationsList(), ESTree.VariableDeclarator.class),
      node.getVariableDeclaration().getKind());
  }

  private static ESTree.VariableDeclarator fromVariableDeclaratorType(Node node) {
    return new ESTree.VariableDeclarator(fromLocation(node.getLoc()),
      from(node.getVariableDeclarator().getId(), ESTree.Pattern.class),
      from(node.getVariableDeclarator().getInit(), ESTree.Expression.class));
  }

  private static ESTree.ImportDeclaration fromImportDeclarationType(Node node) {
    return new ESTree.ImportDeclaration(fromLocation(node.getLoc()),
      from(node.getImportDeclaration().getSpecifiersList(), ESTree.ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier.class),
      from(node.getImportDeclaration().getSource(), ESTree.Literal.class));
  }

  private static ESTree.ImportNamespaceSpecifier fromImportNamespaceSpecifierType(Node node) {
    return new ESTree.ImportNamespaceSpecifier(fromLocation(node.getLoc()),
      from(node.getImportNamespaceSpecifier().getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.ImportDefaultSpecifier fromImportDefaultSpecifierType(Node node) {
    return new ESTree.ImportDefaultSpecifier(fromLocation(node.getLoc()),
      from(node.getImportDefaultSpecifier().getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.ImportSpecifier fromImportSpecifierType(Node node) {
    return new ESTree.ImportSpecifier(fromLocation(node.getLoc()),
      from(node.getImportSpecifier().getImported(), ESTree.Identifier.class),
      from(node.getImportSpecifier().getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.ForOfStatement fromForOfStatementType(Node node) {
    return new ESTree.ForOfStatement(fromLocation(node.getLoc()),
      node.getForOfStatement().getAwait(),
      from(node.getForOfStatement().getLeft(), ESTree.Pattern.class),
      from(node.getForOfStatement().getRight(), ESTree.Expression.class),
      from(node.getForOfStatement().getBody(), ESTree.Statement.class));
  }

  private static ESTree.ForInStatement fromForInStatementType(Node node) {
    return new ESTree.ForInStatement(fromLocation(node.getLoc()),
      from(node.getForInStatement().getLeft(), ESTree.Pattern.class),
      from(node.getForInStatement().getRight(), ESTree.Expression.class),
      from(node.getForInStatement().getBody(), ESTree.Statement.class));
  }

  private static ESTree.ForStatement fromForStatementType(Node node) {
    return new ESTree.ForStatement(fromLocation(node.getLoc()),
      from(node.getForStatement().getInit(), ESTree.ExpressionOrVariableDeclaration.class),
      from(node.getForStatement().getTest(), ESTree.Expression.class),
      from(node.getForStatement().getUpdate(), ESTree.Expression.class),
      from(node.getForStatement().getBody(), ESTree.Statement.class));
  }

  private static ESTree.DoWhileStatement fromDoWhileStatementType(Node node) {
    return new ESTree.DoWhileStatement(fromLocation(node.getLoc()),
      from(node.getDoWhileStatement().getBody(), ESTree.Statement.class),
      from(node.getDoWhileStatement().getTest(), ESTree.Expression.class));
  }

  private static ESTree.WhileStatement fromWhileStatementType(Node node) {
    return new ESTree.WhileStatement(fromLocation(node.getLoc()),
      from(node.getWhileStatement().getTest(), ESTree.Expression.class),
      from(node.getWhileStatement().getBody(), ESTree.Statement.class));
  }

  private static ESTree.TryStatement fromTryStatementType(Node node) {
    return new ESTree.TryStatement(fromLocation(node.getLoc()),
      from(node.getTryStatement().getBlock(), ESTree.BlockStatement.class),
      from(node.getTryStatement().getHandler(), ESTree.CatchClause.class),
      from(node.getTryStatement().getFinalizer(), ESTree.BlockStatement.class));
  }

  private static ESTree.CatchClause fromCatchClauseType(Node node) {
    return new ESTree.CatchClause(fromLocation(node.getLoc()),
      from(node.getCatchClause().getParam(), ESTree.Pattern.class),
      from(node.getCatchClause().getBody(), ESTree.BlockStatement.class));
  }

  private static ESTree.ThrowStatement fromThrowStatementType(Node node) {
    return new ESTree.ThrowStatement(fromLocation(node.getLoc()),
      from(node.getThrowStatement().getArgument(), ESTree.Expression.class));
  }

  private static ESTree.SwitchStatement fromSwitchStatementType(Node node) {
    return new ESTree.SwitchStatement(fromLocation(node.getLoc()),
      from(node.getSwitchStatement().getDiscriminant(), ESTree.Expression.class),
      from(node.getSwitchStatement().getCasesList(), ESTree.SwitchCase.class));
  }

  private static ESTree.SwitchCase fromSwitchCaseType(Node node) {
    return new ESTree.SwitchCase(fromLocation(node.getLoc()),
      from(node.getSwitchCase().getTest(), ESTree.Expression.class),
      from(node.getSwitchCase().getConsequentList(), ESTree.Statement.class));
  }

  private static ESTree.IfStatement fromIfStatementType(Node node) {
    return new ESTree.IfStatement(fromLocation(node.getLoc()),
      from(node.getIfStatement().getTest(), ESTree.Expression.class),
      from(node.getIfStatement().getConsequent(), ESTree.Statement.class),
      from(node.getIfStatement().getAlternate(), ESTree.Statement.class));
  }

  private static ESTree.ContinueStatement fromContinueStatementType(Node node) {
    return new ESTree.ContinueStatement(fromLocation(node.getLoc()),
      from(node.getContinueStatement().getLabel(), ESTree.Identifier.class));
  }

  private static ESTree.BreakStatement fromBreakStatementType(Node node) {
    return new ESTree.BreakStatement(fromLocation(node.getLoc()),
      from(node.getBreakStatement().getLabel(), ESTree.Identifier.class));
  }

  private static ESTree.LabeledStatement fromLabeledStatementType(Node node) {
    return new ESTree.LabeledStatement(fromLocation(node.getLoc()),
      from(node.getLabeledStatement().getLabel(), ESTree.Identifier.class),
      from(node.getLabeledStatement().getBody(), ESTree.Statement.class));
  }

  private static ESTree.ReturnStatement fromReturnStatementType(Node node) {
    return new ESTree.ReturnStatement(fromLocation(node.getLoc()),
      from(node.getReturnStatement().getArgument(), ESTree.Expression.class));
  }

  private static ESTree.WithStatement fromWithStatementType(Node node) {
    return new ESTree.WithStatement(fromLocation(node.getLoc()),
      from(node.getWithStatement().getObject(), ESTree.Expression.class),
      from(node.getWithStatement().getBody(), ESTree.Statement.class));
  }

  private static ESTree.DebuggerStatement fromDebuggerStatementType(Node node) {
    return new ESTree.DebuggerStatement(fromLocation(node.getLoc()));
  }

  private static ESTree.EmptyStatement fromEmptyStatementType(Node node) {
    return new ESTree.EmptyStatement(fromLocation(node.getLoc()));
  }

  private static ESTree.ExpressionStatement fromExpressionStatementType(Node node) {
    // TODO: What about directive?
    return new ESTree.ExpressionStatement(fromLocation(node.getLoc()),
      from(node.getExpressionStatement().getExpression(), ESTree.Expression.class));
  }

  private static ESTree.Literal fromLiteralType(Node node) {
    // TODO handle different types of literals
    return new ESTree.SimpleLiteral(fromLocation(node.getLoc()), node.getLiteral().getValueString(), node.getLiteral().getRaw());
  }

  private static ESTree.TemplateElement fromTemplateElementType(Node node) {
    return new ESTree.TemplateElement(fromLocation(node.getLoc()),
      node.getTemplateElement().getTail(),
      node.getTemplateElement().getCooked(),
      node.getTemplateElement().getRaw()
    );
  }

  private static ESTree.FunctionExpression fromFunctionExpressionType(Node node) {
    return new ESTree.FunctionExpression(fromLocation(node.getLoc()),
      from(node.getFunctionExpression().getId(), ESTree.Identifier.class),
      from(node.getFunctionExpression().getBody(), ESTree.BlockStatement.class),
      from(node.getFunctionExpression().getParamsList(), ESTree.Pattern.class),
      node.getFunctionExpression().getGenerator(),
      node.getFunctionExpression().getAsync());
  }

}
