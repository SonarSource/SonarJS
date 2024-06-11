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

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.protobuf.ArrayExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ArrayPattern;
import org.sonar.plugins.javascript.bridge.protobuf.ArrowFunctionExpression;
import org.sonar.plugins.javascript.bridge.protobuf.AssignmentExpression;
import org.sonar.plugins.javascript.bridge.protobuf.AssignmentPattern;
import org.sonar.plugins.javascript.bridge.protobuf.AwaitExpression;
import org.sonar.plugins.javascript.bridge.protobuf.BinaryExpression;
import org.sonar.plugins.javascript.bridge.protobuf.BlockStatement;
import org.sonar.plugins.javascript.bridge.protobuf.BreakStatement;
import org.sonar.plugins.javascript.bridge.protobuf.CallExpression;
import org.sonar.plugins.javascript.bridge.protobuf.CatchClause;
import org.sonar.plugins.javascript.bridge.protobuf.ChainExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ClassBody;
import org.sonar.plugins.javascript.bridge.protobuf.ClassDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ClassExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ConditionalExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ContinueStatement;
import org.sonar.plugins.javascript.bridge.protobuf.DoWhileStatement;
import org.sonar.plugins.javascript.bridge.protobuf.ExportAllDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ExportDefaultDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ExportNamedDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ExportSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.ExpressionStatement;
import org.sonar.plugins.javascript.bridge.protobuf.ForInStatement;
import org.sonar.plugins.javascript.bridge.protobuf.ForOfStatement;
import org.sonar.plugins.javascript.bridge.protobuf.ForStatement;
import org.sonar.plugins.javascript.bridge.protobuf.FunctionDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.FunctionExpression;
import org.sonar.plugins.javascript.bridge.protobuf.Identifier;
import org.sonar.plugins.javascript.bridge.protobuf.IfStatement;
import org.sonar.plugins.javascript.bridge.protobuf.ImportDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ImportDefaultSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.ImportExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ImportNamespaceSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.ImportSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.LabeledStatement;
import org.sonar.plugins.javascript.bridge.protobuf.Literal;
import org.sonar.plugins.javascript.bridge.protobuf.LogicalExpression;
import org.sonar.plugins.javascript.bridge.protobuf.MemberExpression;
import org.sonar.plugins.javascript.bridge.protobuf.MetaProperty;
import org.sonar.plugins.javascript.bridge.protobuf.MethodDefinition;
import org.sonar.plugins.javascript.bridge.protobuf.NewExpression;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.ObjectExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ObjectPattern;
import org.sonar.plugins.javascript.bridge.protobuf.PrivateIdentifier;
import org.sonar.plugins.javascript.bridge.protobuf.Program;
import org.sonar.plugins.javascript.bridge.protobuf.Property;
import org.sonar.plugins.javascript.bridge.protobuf.PropertyDefinition;
import org.sonar.plugins.javascript.bridge.protobuf.RestElement;
import org.sonar.plugins.javascript.bridge.protobuf.ReturnStatement;
import org.sonar.plugins.javascript.bridge.protobuf.SequenceExpression;
import org.sonar.plugins.javascript.bridge.protobuf.SourceLocation;
import org.sonar.plugins.javascript.bridge.protobuf.SpreadElement;
import org.sonar.plugins.javascript.bridge.protobuf.SwitchCase;
import org.sonar.plugins.javascript.bridge.protobuf.SwitchStatement;
import org.sonar.plugins.javascript.bridge.protobuf.TaggedTemplateExpression;
import org.sonar.plugins.javascript.bridge.protobuf.TemplateElement;
import org.sonar.plugins.javascript.bridge.protobuf.TemplateLiteral;
import org.sonar.plugins.javascript.bridge.protobuf.ThrowStatement;
import org.sonar.plugins.javascript.bridge.protobuf.TryStatement;
import org.sonar.plugins.javascript.bridge.protobuf.UnaryExpression;
import org.sonar.plugins.javascript.bridge.protobuf.UpdateExpression;
import org.sonar.plugins.javascript.bridge.protobuf.VariableDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.VariableDeclarator;
import org.sonar.plugins.javascript.bridge.protobuf.WhileStatement;
import org.sonar.plugins.javascript.bridge.protobuf.WithStatement;
import org.sonar.plugins.javascript.bridge.protobuf.YieldExpression;

/**
 * TODO: Check what happen when ArrayPattern/ArrayExpression contain null
 *
 * TODO: Check how "null" literal is handled.
 */
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
      case ExpressionStatementType -> {
        if (node.getExpressionStatement().hasDirective()) {
          yield fromDirective(node);
        } else {
          yield fromExpressionStatementType(node);
        }
      }
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
    Program program = node.getProgram();
    return new ESTree.Program(fromLocation(node.getLoc()),
      program.getSourceType(),
      from(program.getBodyList(), ESTree.DirectiveOrModuleDeclarationOrStatement.class));
  }

  private static ESTree.ExportAllDeclaration fromExportAllDeclarationType(Node node) {
    ExportAllDeclaration exportAllDeclaration = node.getExportAllDeclaration();
    return new ESTree.ExportAllDeclaration(fromLocation(node.getLoc()),
      exportAllDeclaration.hasExported() ? Optional.of(from(exportAllDeclaration.getExported(), ESTree.Identifier.class)) : Optional.empty(),
      from(exportAllDeclaration.getSource(), ESTree.Literal.class));
  }

  private static ESTree.Identifier fromIdentifierType(Node node) {
    Identifier identifier = node.getIdentifier();
    return new ESTree.Identifier(fromLocation(node.getLoc()),
      identifier.getName());
  }

  private static ESTree.ExportDefaultDeclaration fromExportDefaultDeclarationType(Node node) {
    ExportDefaultDeclaration exportDefaultDeclaration = node.getExportDefaultDeclaration();
    return new ESTree.ExportDefaultDeclaration(fromLocation(node.getLoc()),
      from(exportDefaultDeclaration.getDeclaration(), ESTree.ExpressionOrClassDeclarationOrFunctionDeclaration.class));
  }

  private static ESTree.YieldExpression fromYieldExpressionType(Node node) {
    YieldExpression yieldExpression = node.getYieldExpression();
    return new ESTree.YieldExpression(fromLocation(node.getLoc()),
      yieldExpression.hasArgument() ? Optional.of(from(yieldExpression.getArgument(), ESTree.Expression.class)) : Optional.empty(),
      yieldExpression.getDelegate());
  }

  private static ESTree.UpdateExpression fromUpdateExpressionType(Node node) {
    UpdateExpression updateExpression = node.getUpdateExpression();
    return new ESTree.UpdateExpression(fromLocation(node.getLoc()),
      ESTree.UpdateOperator.from(updateExpression.getOperator()),
      from(updateExpression.getArgument(), ESTree.Expression.class),
      updateExpression.getPrefix());
  }

  private static ESTree.UnaryExpression fromUnaryExpressionType(Node node) {
    UnaryExpression unaryExpression = node.getUnaryExpression();
    return new ESTree.UnaryExpression(fromLocation(node.getLoc()),
      ESTree.UnaryOperator.from(unaryExpression.getOperator()),
      unaryExpression.getPrefix(),
      from(unaryExpression.getArgument(), ESTree.Expression.class));
  }

  private static ESTree.ThisExpression fromThisExpressionType(Node node) {
    return new ESTree.ThisExpression(fromLocation(node.getLoc()));
  }

  private static ESTree.TemplateLiteral fromTemplateLiteralType(Node node) {
    TemplateLiteral templateLiteral = node.getTemplateLiteral();
    return new ESTree.TemplateLiteral(fromLocation(node.getLoc()),
      from(templateLiteral.getQuasisList(), ESTree.TemplateElement.class),
      from(templateLiteral.getExpressionsList(), ESTree.Expression.class));
  }

  private static ESTree.TaggedTemplateExpression fromTaggedTemplateExpressionType(Node node) {
    TaggedTemplateExpression taggedTemplateExpression = node.getTaggedTemplateExpression();
    return new ESTree.TaggedTemplateExpression(fromLocation(node.getLoc()),
      from(taggedTemplateExpression.getTag(), ESTree.Expression.class),
      from(taggedTemplateExpression.getQuasi(), ESTree.TemplateLiteral.class));
  }

  private static ESTree.SequenceExpression fromSequenceExpressionType(Node node) {
    SequenceExpression sequenceExpression = node.getSequenceExpression();
    return new ESTree.SequenceExpression(fromLocation(node.getLoc()),
      from(sequenceExpression.getExpressionsList(), ESTree.Expression.class));
  }

  private static ESTree.ObjectExpression fromObjectExpressionType(Node node) {
    ObjectExpression objectExpression = node.getObjectExpression();
    return new ESTree.ObjectExpression(fromLocation(node.getLoc()),
      from(objectExpression.getPropertiesList(), ESTree.PropertyOrSpreadElement.class));
  }

  private static ESTree.SpreadElement fromSpreadElementType(Node node) {
    SpreadElement spreadElement = node.getSpreadElement();
    return new ESTree.SpreadElement(fromLocation(node.getLoc()),
      from(spreadElement.getArgument(), ESTree.Expression.class));
  }

  private static ESTree.Property fromPropertyType(Node node) {
    Property property = node.getProperty();
    return new ESTree.Property(fromLocation(node.getLoc()),
      from(property.getKey(), ESTree.Expression.class),
      from(property.getValue(), ESTree.Expression.class),
      property.getKind(),
      property.getMethod(),
      property.getShorthand(),
      property.getComputed());
  }

  private static ESTree.AssignmentPattern fromAssignmentPatternType(Node node) {
    AssignmentPattern assignmentPattern = node.getAssignmentPattern();
    return new ESTree.AssignmentPattern(fromLocation(node.getLoc()),
      from(assignmentPattern.getLeft(), ESTree.Pattern.class),
      from(assignmentPattern.getRight(), ESTree.Expression.class));
  }

  private static ESTree.RestElement fromRestElementType(Node node) {
    RestElement restElement = node.getRestElement();
    return new ESTree.RestElement(fromLocation(node.getLoc()),
      from(restElement.getArgument(), ESTree.Pattern.class));
  }

  private static ESTree.ArrayPattern fromArrayPatternType(Node node) {
    ArrayPattern arrayPattern = node.getArrayPattern();
    return new ESTree.ArrayPattern(fromLocation(node.getLoc()),
      from(arrayPattern.getElementsList(), ESTree.Pattern.class));
  }

  private static ESTree.ObjectPattern fromObjectPatternType(Node node) {
    ObjectPattern objectPattern = node.getObjectPattern();
    return new ESTree.ObjectPattern(fromLocation(node.getLoc()),
      from(objectPattern.getPropertiesList(), ESTree.PropertyOrRestElement.class));
  }

  private static ESTree.PrivateIdentifier fromPrivateIdentifierType(Node node) {
    PrivateIdentifier privateIdentifier = node.getPrivateIdentifier();
    return new ESTree.PrivateIdentifier(fromLocation(node.getLoc()),
      privateIdentifier.getName());
  }

  private static ESTree.NewExpression fromNewExpressionType(Node node) {
    NewExpression newExpression = node.getNewExpression();
    return new ESTree.NewExpression(fromLocation(node.getLoc()),
      from(newExpression.getCallee(), ESTree.Expression.class),
      from(newExpression.getArgumentsList(), ESTree.ExpressionOrSpreadElement.class));
  }

  private static ESTree.Super fromSuperType(Node node) {
    return new ESTree.Super(fromLocation(node.getLoc()));
  }

  private static ESTree.MetaProperty fromMetaPropertyType(Node node) {
    MetaProperty metaProperty = node.getMetaProperty();
    return new ESTree.MetaProperty(fromLocation(node.getLoc()),
      from(metaProperty.getMeta(), ESTree.Identifier.class),
      from(metaProperty.getProperty(), ESTree.Identifier.class));
  }

  private static ESTree.MemberExpression fromMemberExpressionType(Node node) {
    MemberExpression memberExpression = node.getMemberExpression();
    return new ESTree.MemberExpression(fromLocation(node.getLoc()),
      from(memberExpression.getObject(), ESTree.ExpressionOrSuper.class),
      from(memberExpression.getProperty(), ESTree.ExpressionOrPrivateIdentifier.class),
      memberExpression.getComputed(),
      memberExpression.getOptional());
  }

  private static ESTree.LogicalExpression fromLogicalExpressionType(Node node) {
    LogicalExpression logicalExpression = node.getLogicalExpression();
    return new ESTree.LogicalExpression(fromLocation(node.getLoc()),
      ESTree.LogicalOperator.from(logicalExpression.getOperator()),
      from(logicalExpression.getLeft(), ESTree.Expression.class),
      from(logicalExpression.getRight(), ESTree.Expression.class));
  }

  private static ESTree.ImportExpression fromImportExpressionType(Node node) {
    ImportExpression importExpression = node.getImportExpression();
    return new ESTree.ImportExpression(fromLocation(node.getLoc()),
      from(importExpression.getSource(), ESTree.Expression.class));
  }

  private static ESTree.BlockStatement fromBlockStatementType(Node node) {
    BlockStatement blockStatement = node.getBlockStatement();
    return new ESTree.BlockStatement(fromLocation(node.getLoc()),
      from(blockStatement.getBodyList(), ESTree.Statement.class));
  }

  private static ESTree.ConditionalExpression fromConditionalExpressionType(Node node) {
    ConditionalExpression conditionalExpression = node.getConditionalExpression();
    return new ESTree.ConditionalExpression(fromLocation(node.getLoc()),
      from(conditionalExpression.getTest(), ESTree.Expression.class),
      from(conditionalExpression.getAlternate(), ESTree.Expression.class),
      from(conditionalExpression.getConsequent(), ESTree.Expression.class));
  }

  private static ESTree.ClassExpression fromClassExpressionType(Node node) {
    ClassExpression classExpression = node.getClassExpression();
    return new ESTree.ClassExpression(fromLocation(node.getLoc()),
      classExpression.hasId() ? Optional.of(from(classExpression.getId(), ESTree.Identifier.class)) : Optional.empty(),
      from(classExpression.getSuperClass(), ESTree.Expression.class),
      from(classExpression.getBody(), ESTree.ClassBody.class));
  }

  private static ESTree.ClassBody fromClassBodyType(Node node) {
    ClassBody classBody = node.getClassBody();
    return new ESTree.ClassBody(fromLocation(node.getLoc()),
      from(classBody.getBodyList(), ESTree.MethodDefinitionOrPropertyDefinitionOrStaticBlock.class));
  }

  private static ESTree.StaticBlock fromStaticBlockType(Node node) {
    return new ESTree.StaticBlock(fromLocation(node.getLoc()));
  }

  private static ESTree.PropertyDefinition fromPropertyDefinitionType(Node node) {
    PropertyDefinition propertyDefinition = node.getPropertyDefinition();
    return new ESTree.PropertyDefinition(fromLocation(node.getLoc()),
      from(propertyDefinition.getKey(), ESTree.Expression.class),
      propertyDefinition.hasValue() ? Optional.of(from(propertyDefinition.getValue(), ESTree.Expression.class)) : Optional.empty(),
      propertyDefinition.getComputed(),
      propertyDefinition.getStatic());
  }

  private static ESTree.MethodDefinition fromMethodDefinitionType(Node node) {
    MethodDefinition methodDefinition = node.getMethodDefinition();
    return new ESTree.MethodDefinition(fromLocation(node.getLoc()),
      from(methodDefinition.getKey(), ESTree.Expression.class),
      from(methodDefinition.getValue(), ESTree.FunctionExpression.class),
      methodDefinition.getKind(),
      methodDefinition.getComputed(), methodDefinition.getStatic());
  }

  private static ESTree.ChainExpression fromChainExpressionType(Node node) {
    ChainExpression chainExpression = node.getChainExpression();
    return new ESTree.ChainExpression(fromLocation(node.getLoc()),
      from(chainExpression.getExpression(), ESTree.ChainElement.class));
  }

  private static ESTree.CallExpression fromCallExpressionType(Node node) {
    CallExpression callExpression = node.getCallExpression();
    return new ESTree.SimpleCallExpression(fromLocation(node.getLoc()),
      callExpression.getOptional(),
      from(callExpression.getCallee(), ESTree.ExpressionOrSuper.class),
      from(callExpression.getArgumentsList(), ESTree.ExpressionOrSpreadElement.class));
  }

  private static ESTree.BinaryExpression fromBinaryExpressionType(Node node) {
    BinaryExpression binaryExpression = node.getBinaryExpression();
    return new ESTree.BinaryExpression(fromLocation(node.getLoc()),
      ESTree.BinaryOperator.from(binaryExpression.getOperator()),
      from(binaryExpression.getLeft(), ESTree.Expression.class),
      from(binaryExpression.getRight(), ESTree.Expression.class));
  }

  private static ESTree.AwaitExpression fromAwaitExpressionType(Node node) {
    AwaitExpression awaitExpression = node.getAwaitExpression();
    return new ESTree.AwaitExpression(fromLocation(node.getLoc()),
      from(awaitExpression.getArgument(), ESTree.Expression.class));
  }

  private static ESTree.AssignmentExpression fromAssignmentExpressionType(Node node) {
    AssignmentExpression assignmentExpression = node.getAssignmentExpression();
    return new ESTree.AssignmentExpression(fromLocation(node.getLoc()),
      ESTree.AssignmentOperator.from(assignmentExpression.getOperator()),
      from(assignmentExpression.getLeft(), ESTree.Pattern.class),
      from(assignmentExpression.getRight(), ESTree.Expression.class));
  }

  private static ESTree.ArrowFunctionExpression fromArrowFunctionExpressionType(Node node) {
    ArrowFunctionExpression arrowFunctionExpression = node.getArrowFunctionExpression();
    return new ESTree.ArrowFunctionExpression(fromLocation(node.getLoc()),
      arrowFunctionExpression.getExpression(),
      from(arrowFunctionExpression.getBody(), ESTree.BlockStatementOrExpression.class),
      from(arrowFunctionExpression.getParamsList(), ESTree.Pattern.class),
      arrowFunctionExpression.getGenerator(),
      arrowFunctionExpression.getAsync());
  }

  private static ESTree.ArrayExpression fromArrayExpressionType(Node node) {
    ArrayExpression arrayExpression = node.getArrayExpression();
    return new ESTree.ArrayExpression(fromLocation(node.getLoc()),
      from(arrayExpression.getElementsList(), ESTree.ExpressionOrSpreadElement.class));
  }

  private static ESTree.ClassDeclaration fromClassDeclarationType(Node node) {
    ClassDeclaration classDeclaration = node.getClassDeclaration();
    return new ESTree.ClassDeclaration(fromLocation(node.getLoc()),
      classDeclaration.hasId() ? Optional.of(from(classDeclaration.getId(), ESTree.Identifier.class)) : Optional.empty(),
      from(classDeclaration.getSuperClass(), ESTree.Expression.class),
      from(classDeclaration.getBody(), ESTree.ClassBody.class));
  }

  private static ESTree.FunctionDeclaration fromFunctionDeclarationType(Node node) {
    FunctionDeclaration functionDeclaration = node.getFunctionDeclaration();
    return new ESTree.FunctionDeclaration(fromLocation(node.getLoc()),
      functionDeclaration.hasId() ? Optional.of(from(functionDeclaration.getId(), ESTree.Identifier.class)) : Optional.empty(),
      from(functionDeclaration.getBody(), ESTree.BlockStatement.class),
      from(functionDeclaration.getParamsList(), ESTree.Pattern.class),
      functionDeclaration.getGenerator(),
      functionDeclaration.getAsync());
  }

  private static ESTree.ExportNamedDeclaration fromExportNamedDeclarationType(Node node) {
    ExportNamedDeclaration exportNamedDeclaration = node.getExportNamedDeclaration();
    return new ESTree.ExportNamedDeclaration(fromLocation(node.getLoc()),
      exportNamedDeclaration.hasDeclaration() ? Optional.of(from(exportNamedDeclaration.getDeclaration(), ESTree.Declaration.class)) : Optional.empty(),
      from(exportNamedDeclaration.getSpecifiersList(), ESTree.ExportSpecifier.class),
      exportNamedDeclaration.hasSource() ? Optional.of(from(exportNamedDeclaration.getSource(), ESTree.Literal.class)) : Optional.empty());
  }

  private static ESTree.ExportSpecifier fromExportSpecifierType(Node node) {
    ExportSpecifier exportSpecifier = node.getExportSpecifier();
    return new ESTree.ExportSpecifier(fromLocation(node.getLoc()),
      from(exportSpecifier.getExported(), ESTree.Identifier.class),
      from(exportSpecifier.getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.VariableDeclaration fromVariableDeclarationType(Node node) {
    VariableDeclaration variableDeclaration = node.getVariableDeclaration();
    return new ESTree.VariableDeclaration(fromLocation(node.getLoc()),
      from(variableDeclaration.getDeclarationsList(), ESTree.VariableDeclarator.class),
      variableDeclaration.getKind());
  }

  private static ESTree.VariableDeclarator fromVariableDeclaratorType(Node node) {
    VariableDeclarator variableDeclarator = node.getVariableDeclarator();
    return new ESTree.VariableDeclarator(fromLocation(node.getLoc()),
      from(variableDeclarator.getId(), ESTree.Pattern.class),
      variableDeclarator.hasInit() ? Optional.of(from(variableDeclarator.getInit(), ESTree.Expression.class)) : Optional.empty());
  }

  private static ESTree.ImportDeclaration fromImportDeclarationType(Node node) {
    ImportDeclaration importDeclaration = node.getImportDeclaration();
    return new ESTree.ImportDeclaration(fromLocation(node.getLoc()),
      from(importDeclaration.getSpecifiersList(), ESTree.ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier.class),
      from(importDeclaration.getSource(), ESTree.Literal.class));
  }

  private static ESTree.ImportNamespaceSpecifier fromImportNamespaceSpecifierType(Node node) {
    ImportNamespaceSpecifier importNamespaceSpecifier = node.getImportNamespaceSpecifier();
    return new ESTree.ImportNamespaceSpecifier(fromLocation(node.getLoc()),
      from(importNamespaceSpecifier.getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.ImportDefaultSpecifier fromImportDefaultSpecifierType(Node node) {
    ImportDefaultSpecifier importDefaultSpecifier = node.getImportDefaultSpecifier();
    return new ESTree.ImportDefaultSpecifier(fromLocation(node.getLoc()),
      from(importDefaultSpecifier.getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.ImportSpecifier fromImportSpecifierType(Node node) {
    ImportSpecifier importSpecifier = node.getImportSpecifier();
    return new ESTree.ImportSpecifier(fromLocation(node.getLoc()),
      from(importSpecifier.getImported(), ESTree.Identifier.class),
      from(importSpecifier.getLocal(), ESTree.Identifier.class));
  }

  private static ESTree.ForOfStatement fromForOfStatementType(Node node) {
    ForOfStatement forOfStatement = node.getForOfStatement();
    return new ESTree.ForOfStatement(fromLocation(node.getLoc()),
      forOfStatement.getAwait(),
      from(forOfStatement.getLeft(), ESTree.Pattern.class),
      from(forOfStatement.getRight(), ESTree.Expression.class),
      from(forOfStatement.getBody(), ESTree.Statement.class));
  }

  private static ESTree.ForInStatement fromForInStatementType(Node node) {
    ForInStatement forInStatement = node.getForInStatement();
    return new ESTree.ForInStatement(fromLocation(node.getLoc()),
      from(forInStatement.getLeft(), ESTree.Pattern.class),
      from(forInStatement.getRight(), ESTree.Expression.class),
      from(forInStatement.getBody(), ESTree.Statement.class));
  }

  private static ESTree.ForStatement fromForStatementType(Node node) {
    ForStatement forStatement = node.getForStatement();
    return new ESTree.ForStatement(fromLocation(node.getLoc()),
      forStatement.hasInit() ? Optional.of(from(forStatement.getInit(), ESTree.ExpressionOrVariableDeclaration.class)) : Optional.empty(),
      forStatement.hasTest() ? Optional.of(from(forStatement.getTest(), ESTree.Expression.class)) : Optional.empty(),
      forStatement.hasUpdate() ? Optional.of(from(forStatement.getUpdate(), ESTree.Expression.class)) : Optional.empty(),
      from(forStatement.getBody(), ESTree.Statement.class));
  }

  private static ESTree.DoWhileStatement fromDoWhileStatementType(Node node) {
    DoWhileStatement doWhileStatement = node.getDoWhileStatement();
    return new ESTree.DoWhileStatement(fromLocation(node.getLoc()),
      from(doWhileStatement.getBody(), ESTree.Statement.class),
      from(doWhileStatement.getTest(), ESTree.Expression.class));
  }

  private static ESTree.WhileStatement fromWhileStatementType(Node node) {
    WhileStatement whileStatement = node.getWhileStatement();
    return new ESTree.WhileStatement(fromLocation(node.getLoc()),
      from(whileStatement.getTest(), ESTree.Expression.class),
      from(whileStatement.getBody(), ESTree.Statement.class));
  }

  private static ESTree.TryStatement fromTryStatementType(Node node) {
    TryStatement tryStatement = node.getTryStatement();
    return new ESTree.TryStatement(fromLocation(node.getLoc()),
      from(tryStatement.getBlock(), ESTree.BlockStatement.class),
      tryStatement.hasHandler() ? Optional.of(from(tryStatement.getHandler(), ESTree.CatchClause.class)) : Optional.empty(),
      tryStatement.hasFinalizer() ? Optional.of(from(tryStatement.getFinalizer(), ESTree.BlockStatement.class)) : Optional.empty());
  }

  private static ESTree.CatchClause fromCatchClauseType(Node node) {
    CatchClause catchClause = node.getCatchClause();
    return new ESTree.CatchClause(fromLocation(node.getLoc()),
      catchClause.hasParam() ? Optional.of(from(catchClause.getParam(), ESTree.Pattern.class)) : Optional.empty(),
      from(catchClause.getBody(), ESTree.BlockStatement.class));
  }

  private static ESTree.ThrowStatement fromThrowStatementType(Node node) {
    ThrowStatement throwStatement = node.getThrowStatement();
    return new ESTree.ThrowStatement(fromLocation(node.getLoc()),
      from(throwStatement.getArgument(), ESTree.Expression.class));
  }

  private static ESTree.SwitchStatement fromSwitchStatementType(Node node) {
    SwitchStatement switchStatement = node.getSwitchStatement();
    return new ESTree.SwitchStatement(fromLocation(node.getLoc()),
      from(switchStatement.getDiscriminant(), ESTree.Expression.class),
      from(switchStatement.getCasesList(), ESTree.SwitchCase.class));
  }

  private static ESTree.SwitchCase fromSwitchCaseType(Node node) {
    SwitchCase switchCase = node.getSwitchCase();
    return new ESTree.SwitchCase(fromLocation(node.getLoc()),
      switchCase.hasTest() ? Optional.of(from(switchCase.getTest(), ESTree.Expression.class)) : Optional.empty(),
      from(switchCase.getConsequentList(), ESTree.Statement.class));
  }

  private static ESTree.IfStatement fromIfStatementType(Node node) {
    IfStatement ifStatement = node.getIfStatement();
    return new ESTree.IfStatement(fromLocation(node.getLoc()),
      from(ifStatement.getTest(), ESTree.Expression.class),
      from(ifStatement.getConsequent(), ESTree.Statement.class),
      ifStatement.hasAlternate() ? Optional.of(from(ifStatement.getAlternate(), ESTree.Statement.class)) : Optional.empty());
  }

  private static ESTree.ContinueStatement fromContinueStatementType(Node node) {
    ContinueStatement continueStatement = node.getContinueStatement();
    return new ESTree.ContinueStatement(fromLocation(node.getLoc()),
      continueStatement.hasLabel() ? Optional.of(from(continueStatement.getLabel(), ESTree.Identifier.class)) : Optional.empty());
  }

  private static ESTree.BreakStatement fromBreakStatementType(Node node) {
    BreakStatement breakStatement = node.getBreakStatement();
    return new ESTree.BreakStatement(fromLocation(node.getLoc()),
      breakStatement.hasLabel() ? Optional.of(from(breakStatement.getLabel(), ESTree.Identifier.class)) : Optional.empty());
  }

  private static ESTree.LabeledStatement fromLabeledStatementType(Node node) {
    LabeledStatement labeledStatement = node.getLabeledStatement();
    return new ESTree.LabeledStatement(fromLocation(node.getLoc()),
      from(labeledStatement.getLabel(), ESTree.Identifier.class),
      from(labeledStatement.getBody(), ESTree.Statement.class));
  }

  private static ESTree.ReturnStatement fromReturnStatementType(Node node) {
    ReturnStatement returnStatement = node.getReturnStatement();
    return new ESTree.ReturnStatement(fromLocation(node.getLoc()),
      returnStatement.hasArgument() ? Optional.of(from(returnStatement.getArgument(), ESTree.Expression.class)) : Optional.empty());
  }

  private static ESTree.WithStatement fromWithStatementType(Node node) {
    WithStatement withStatement = node.getWithStatement();
    return new ESTree.WithStatement(fromLocation(node.getLoc()),
      from(withStatement.getObject(), ESTree.Expression.class),
      from(withStatement.getBody(), ESTree.Statement.class));
  }

  private static ESTree.DebuggerStatement fromDebuggerStatementType(Node node) {
    return new ESTree.DebuggerStatement(fromLocation(node.getLoc()));
  }

  private static ESTree.EmptyStatement fromEmptyStatementType(Node node) {
    return new ESTree.EmptyStatement(fromLocation(node.getLoc()));
  }

  private static ESTree.ExpressionStatement fromExpressionStatementType(Node node) {
    ExpressionStatement expressionStatement = node.getExpressionStatement();
    return new ESTree.ExpressionStatement(fromLocation(node.getLoc()),
      from(expressionStatement.getExpression(), ESTree.Expression.class));
  }

  private static ESTree.Directive fromDirective(Node node) {
    ExpressionStatement directive = node.getExpressionStatement();
    return new ESTree.Directive(fromLocation(node.getLoc()),
      from(directive.getExpression(), ESTree.Literal.class),
      directive.getDirective());
  }

  private static ESTree.Literal fromLiteralType(Node node) {
    Literal literal = node.getLiteral();
    if (literal.hasBigint()) {
      return new ESTree.BigIntLiteral(fromLocation(node.getLoc()), new BigInteger(literal.getBigint()), literal.getBigint(), literal.getRaw());
    } else if (literal.hasPattern()) {
      return new ESTree.RegExpLiteral(fromLocation(node.getLoc()), literal.getPattern(), literal.getFlags(), literal.getRaw());
    } else {
      if (literal.hasValueString()) {
        return new ESTree.SimpleLiteral(fromLocation(node.getLoc()), literal.getValueString(), node.getLiteral().getRaw());
      } else if (literal.hasValueBoolean()) {
        return new ESTree.SimpleLiteral(fromLocation(node.getLoc()), literal.getValueBoolean(), node.getLiteral().getRaw());
      } else {
        return new ESTree.SimpleLiteral(fromLocation(node.getLoc()), literal.getValueNumber(), node.getLiteral().getRaw());
      }
    }
  }

  private static ESTree.TemplateElement fromTemplateElementType(Node node) {
    TemplateElement templateElement = node.getTemplateElement();
    return new ESTree.TemplateElement(fromLocation(node.getLoc()),
      templateElement.getTail(),
      templateElement.getCooked(),
      templateElement.getRaw()
    );
  }

  private static ESTree.FunctionExpression fromFunctionExpressionType(Node node) {
    FunctionExpression functionExpression = node.getFunctionExpression();
    return new ESTree.FunctionExpression(fromLocation(node.getLoc()),
      functionExpression.hasId() ? Optional.of(from(functionExpression.getId(), ESTree.Identifier.class)) : Optional.empty(),
      from(functionExpression.getBody(), ESTree.BlockStatement.class),
      from(functionExpression.getParamsList(), ESTree.Pattern.class),
      functionExpression.getGenerator(),
      functionExpression.getAsync());
  }

}
