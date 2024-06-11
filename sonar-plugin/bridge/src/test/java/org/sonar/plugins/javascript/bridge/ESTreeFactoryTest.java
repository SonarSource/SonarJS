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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.protobuf.AssignmentExpression;
import org.sonar.plugins.javascript.bridge.protobuf.AssignmentPattern;
import org.sonar.plugins.javascript.bridge.protobuf.BinaryExpression;
import org.sonar.plugins.javascript.bridge.protobuf.BlockStatement;
import org.sonar.plugins.javascript.bridge.protobuf.CallExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ClassDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ExportDefaultDeclaration;
import org.sonar.plugins.javascript.bridge.protobuf.ExportSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.ExpressionStatement;
import org.sonar.plugins.javascript.bridge.protobuf.ImportDefaultSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.ImportExpression;
import org.sonar.plugins.javascript.bridge.protobuf.ImportSpecifier;
import org.sonar.plugins.javascript.bridge.protobuf.Literal;
import org.sonar.plugins.javascript.bridge.protobuf.LogicalExpression;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.NodeType;
import org.sonar.plugins.javascript.bridge.protobuf.Position;
import org.sonar.plugins.javascript.bridge.protobuf.Program;
import org.sonar.plugins.javascript.bridge.protobuf.SourceLocation;
import org.sonar.plugins.javascript.bridge.protobuf.UnaryExpression;
import org.sonar.plugins.javascript.bridge.protobuf.UpdateExpression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

class ESTreeFactoryTest {

  @Test
  void should_create_nodes_from_serialized_data() throws IOException {
    File file = Path.of("src", "test", "resources", "files", "serialized.proto").toFile();

    Node node;
    try (FileInputStream fis = new FileInputStream(file)) {
      node = Node.parseFrom(fis);
    }
    ESTree.Node root = ESTreeFactory.from(node, ESTree.Node.class);
    assertThat(root).isInstanceOf(ESTree.Program.class);
    ESTree.Program program = (ESTree.Program) root;
    assertThat(program.body()).hasSize(52);
    // Assert a few nodes.
    assertThat(program.body().get(0)).isInstanceOfSatisfying(ESTree.VariableDeclaration.class, variableDeclaration -> {
      assertThat(variableDeclaration.declarations()).hasSize(1);
      assertThat(variableDeclaration.kind()).isEqualTo("let");
      ESTree.VariableDeclarator variableDeclarator = variableDeclaration.declarations().get(0);
      assertThat(variableDeclarator.id()).isInstanceOf(ESTree.Identifier.class);
      assertThat(variableDeclarator.init()).contains(new ESTree.SimpleLiteral(
          new ESTree.Location(new ESTree.Position(20, 8), new ESTree.Position(20, 12)),
          "",
          "null"
        )
      );
    });
    assertThat(program.body().get(14)).isInstanceOfSatisfying(ESTree.IfStatement.class, ifStatement -> {
      assertThat(ifStatement.test()).isInstanceOf(ESTree.Identifier.class);
      assertThat(ifStatement.consequent()).isInstanceOf(ESTree.BlockStatement.class);
      assertThat(ifStatement.alternate()).isEmpty();
    });
  }

  @Test
  void should_create_program() {
    Node body = Node.newBuilder()
      .setType(NodeType.BlockStatementType)
      .setBlockStatement(BlockStatement.newBuilder().build())
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ProgramType)
      .setProgram(Program.newBuilder()
        .setSourceType("script")
        .addBody(body)
        .build())
      .setLoc(SourceLocation.newBuilder()
        .setStart(Position.newBuilder().setLine(1).setColumn(2).build())
        .setEnd(Position.newBuilder().setLine(3).setColumn(4).build())
        .build())
      .build();

    ESTree.Program estreeProgram = ESTreeFactory.from(protobufNode, ESTree.Program.class);
    assertThat(estreeProgram.sourceType()).isEqualTo("script");
    assertThat(estreeProgram.loc().start().line()).isEqualTo(1);
    assertThat(estreeProgram.loc().start().column()).isEqualTo(2);
    assertThat(estreeProgram.loc().end().line()).isEqualTo(3);
    assertThat(estreeProgram.loc().end().column()).isEqualTo(4);
    assertThat(estreeProgram.body()).hasSize(1);
    ESTree.Node estreeBody = estreeProgram.body().get(0);
    assertThat(estreeBody).isInstanceOfSatisfying(ESTree.BlockStatement.class,
      blockStatement -> assertThat(blockStatement.body()).isEmpty());
  }

  @Test
  void should_create_expression_statement_when_directive_is_empty() {
    Node expressionContent = Node.newBuilder()
      .setType(NodeType.ThisExpressionType)
      .build();
    ExpressionStatement expressionStatement = ExpressionStatement.newBuilder()
      .setExpression(expressionContent)
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ExpressionStatementType)
      .setExpressionStatement(expressionStatement)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOf(ESTree.ExpressionStatement.class);
  }

  @Test
  void should_create_directive_from_expression_statement() {
    Node expressionContent = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .build();
    ExpressionStatement expressionStatement = ExpressionStatement.newBuilder()
      .setDirective("directive")
      .setExpression(expressionContent)
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ExpressionStatementType)
      .setExpressionStatement(expressionStatement)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.Directive.class,
      directive -> assertThat(directive.directive()).isEqualTo("directive"));
  }

  @Test
  void should_create_BigIntLiteral() {
    Literal literal = Literal.newBuilder()
      .setBigint("1234")
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.BigIntLiteral.class, bigIntLiteral -> {
      assertThat(bigIntLiteral.bigint()).isEqualTo("1234");
      assertThat(bigIntLiteral.value()).isEqualTo(new BigInteger("1234"));
      // Default value.
      assertThat(bigIntLiteral.raw()).isEmpty();
    });
  }

  @Test
  void should_create_simple_string_literal() {
    Literal literal = Literal.newBuilder()
      .setRaw("'raw'")
      .setValueString("raw")
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.SimpleLiteral.class, simpleLiteral -> {
      assertThat(simpleLiteral.raw()).isEqualTo("'raw'");
      assertThat(simpleLiteral.value()).isEqualTo("raw");
    });
  }

  @Test
  void should_create_simple_int_literal() {
    Literal literal = Literal.newBuilder()
      .setRaw("42")
      .setValueNumber(42)
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.SimpleLiteral.class, simpleLiteral -> {
      assertThat(simpleLiteral.raw()).isEqualTo("42");
      assertThat(simpleLiteral.value()).isEqualTo(42);
    });
  }

  @Test
  void should_create_simple_bool_literal() {
    Literal literal = Literal.newBuilder()
      .setRaw("true")
      .setValueBoolean(true)
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.SimpleLiteral.class, simpleLiteral -> {
      assertThat(simpleLiteral.raw()).isEqualTo("true");
      assertThat(simpleLiteral.value()).isEqualTo(true);
    });
  }


  @Test
  void should_create_reg_exp_literal() {
    Literal literal = Literal.newBuilder()
      .setPattern("1234")
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.RegExpLiteral.class, regExpLiteral -> {
      assertThat(regExpLiteral.pattern()).isEqualTo("1234");
      assertThat(regExpLiteral.flags()).isEmpty();
      // Default value.
      assertThat(regExpLiteral.raw()).isEmpty();
    });
  }

  @Test
  void should_create_reg_exp_literal_with_flag() {
    Literal literal = Literal.newBuilder()
      .setPattern("1234")
      .setFlags("flag")
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.RegExpLiteral.class, regExpLiteral -> {
      assertThat(regExpLiteral.pattern()).isEqualTo("1234");
      assertThat(regExpLiteral.flags()).isEqualTo("flag");
      // Default value.
      assertThat(regExpLiteral.raw()).isEmpty();
    });
  }

  @Test
  void should_create_simple_null_literal() {
    // Null literal is represented as a raw value "null" in protobuf.
    // The field "value" will not be set, resulting in an empty string.
    Literal literal = Literal.newBuilder()
      .setRaw("null")
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LiteralType)
      .setLiteral(literal)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.SimpleLiteral.class, simpleLiteral -> {
      assertThat(simpleLiteral.raw()).isEqualTo("null");
      assertThat(simpleLiteral.value()).isEqualTo("");
    });
  }

  @Test
  void should_create_simple_call_expression() {
    CallExpression callExpression = CallExpression.newBuilder()
      .setCallee(Node.newBuilder().setType(NodeType.SuperType).build())
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.CallExpressionType)
      .setCallExpression(callExpression)
      .build();

    ESTree.Node estreeExpressionStatement = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estreeExpressionStatement).isInstanceOfSatisfying(ESTree.CallExpression.class, estreeCallExpression -> {
      assertThat(estreeCallExpression.callee()).isInstanceOf(ESTree.Super.class);
      assertThat(estreeCallExpression.arguments()).isEmpty();
    });
  }

  @Test
  void should_create_binary_expression() {
    BinaryExpression binaryExpression = BinaryExpression.newBuilder()
      .setOperator("-")
      .setLeft(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .setRight(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.BinaryExpressionType)
      .setBinaryExpression(binaryExpression)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.BinaryExpression.class, binary -> {
      assertThat(binary.left()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(binary.right()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(binary.operator()).isEqualTo(ESTree.BinaryOperator.MINUS);
    });
  }

  @Test
  void should_create_unary_expression() {
    UnaryExpression binaryExpression = UnaryExpression.newBuilder()
      .setOperator("!")
      .setArgument(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .setPrefix(true)
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.UnaryExpressionType)
      .setUnaryExpression(binaryExpression)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.UnaryExpression.class, unary -> {
      assertThat(unary.argument()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(unary.prefix()).isTrue();
      assertThat(unary.operator()).isEqualTo(ESTree.UnaryOperator.LOGICAL_NOT);
    });
  }


  @Test
  void should_create_logical_expression() {
    LogicalExpression logicalExpression = LogicalExpression.newBuilder()
      .setOperator("&&")
      .setLeft(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .setRight(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.LogicalExpressionType)
      .setLogicalExpression(logicalExpression)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.LogicalExpression.class, logical -> {
      assertThat(logical.left()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(logical.right()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(logical.operator()).isEqualTo(ESTree.LogicalOperator.AND);
    });
  }

  @Test
  void should_create_assignment_expression() {
    AssignmentExpression assignmentExpression = AssignmentExpression.newBuilder()
      .setOperator(">>>=")
      .setLeft(Node.newBuilder().setType(NodeType.ArrayPatternType).build())
      .setRight(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.AssignmentExpressionType)
      .setAssignmentExpression(assignmentExpression)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.AssignmentExpression.class, logical -> {
      assertThat(logical.left()).isInstanceOf(ESTree.ArrayPattern.class);
      assertThat(logical.right()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(logical.operator()).isEqualTo(ESTree.AssignmentOperator.UNSIGNED_RIGHT_SHIFT_ASSIGN);
    });
  }

  @Test
  void should_create_update_expression() {
    UpdateExpression updateExpression = UpdateExpression.newBuilder()
      .setOperator("--")
      .setArgument(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.UpdateExpressionType)
      .setUpdateExpression(updateExpression)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.UpdateExpression.class, logical -> {
      assertThat(logical.argument()).isInstanceOf(ESTree.ThisExpression.class);
      assertThat(logical.prefix()).isFalse();
      assertThat(logical.operator()).isEqualTo(ESTree.UpdateOperator.DECREMENT);
    });
  }

  @Test
  void should_create_export_default_declaration() {
    ClassDeclaration classDeclaration = ClassDeclaration.newBuilder()
      .setBody(Node.newBuilder().setType(NodeType.ClassBodyType).build())
      .build();
    Node classDeclarationNode = Node.newBuilder()
      .setType(NodeType.ClassDeclarationType)
      .setClassDeclaration(classDeclaration)
      .build();
    ExportDefaultDeclaration declaration = ExportDefaultDeclaration.newBuilder()
      .setDeclaration(classDeclarationNode)
      .build();
    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ExportDefaultDeclarationType)
      .setExportDefaultDeclaration(declaration)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.ExportDefaultDeclaration.class, export -> {
      assertThat(export.declaration()).isInstanceOf(ESTree.ClassDeclaration.class);
    });
  }

  @Test
  void should_create_assignment_pattern() {
    AssignmentPattern assignmentPattern = AssignmentPattern.newBuilder()
      .setLeft(Node.newBuilder().setType(NodeType.ArrayPatternType).build())
      .setRight(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .build();

    Node protobufNode = Node.newBuilder()
      .setType(NodeType.AssignmentPatternType)
      .setAssignmentPattern(assignmentPattern)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.AssignmentPattern.class, pattern -> {
      assertThat(pattern.left()).isInstanceOf(ESTree.ArrayPattern.class);
      assertThat(pattern.right()).isInstanceOf(ESTree.ThisExpression.class);
    });
  }

  @Test
  void should_create_import_expression() {
    ImportExpression importExpression = ImportExpression.newBuilder()
      .setSource(Node.newBuilder().setType(NodeType.ThisExpressionType).build())
      .build();

    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ImportExpressionType)
      .setImportExpression(importExpression)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOfSatisfying(ESTree.ImportExpression.class, expression -> assertThat(expression.source()).isInstanceOf(ESTree.ThisExpression.class));
  }

  @Test
  void should_create_export_specifier_type() {
    ExportSpecifier exportSpecifier = ExportSpecifier.newBuilder()
      .setLocal(Node.newBuilder().setType(NodeType.IdentifierType).build())
      .setExported(Node.newBuilder().setType(NodeType.IdentifierType).build())
      .build();

    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ExportSpecifierType)
      .setExportSpecifier(exportSpecifier)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOf(ESTree.ExportSpecifier.class);
  }

  @Test
  void should_create_import_default_specifier_type() {
    ImportDefaultSpecifier importDefaultSpecifier = ImportDefaultSpecifier.newBuilder()
      .setLocal(Node.newBuilder().setType(NodeType.IdentifierType).build())
      .build();

    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ImportDefaultSpecifierType)
      .setImportDefaultSpecifier(importDefaultSpecifier)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOf(ESTree.ImportDefaultSpecifier.class);
  }

  @Test
  void should_create_import_specifier_type() {
    ImportSpecifier importSpecifier = ImportSpecifier.newBuilder()
      .setLocal(Node.newBuilder().setType(NodeType.IdentifierType).build())
      .setImported(Node.newBuilder().setType(NodeType.IdentifierType).build())
      .build();

    Node protobufNode = Node.newBuilder()
      .setType(NodeType.ImportSpecifierType)
      .setImportSpecifier(importSpecifier)
      .build();

    ESTree.Node estree = ESTreeFactory.from(protobufNode, ESTree.Node.class);
    assertThat(estree).isInstanceOf(ESTree.ImportSpecifier.class);
  }

  @Test
  void throw_exception_from_unrecognized_type() {
    Node protobufNode = Node.newBuilder()
      .setTypeValue(-1)
      .build();

    assertThatThrownBy(() -> ESTreeFactory.from(protobufNode, ESTree.Node.class))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageStartingWith("Unknown node type: UNRECOGNIZED");
  }
}
