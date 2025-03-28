/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.standalone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.sonar.plugins.javascript.api.estree.ESTree.Program;

import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.api.estree.ESTree;

class StandaloneParserTest {

  private static StandaloneParser parser;

  @BeforeAll
  static void setUp() {
    parser = new StandaloneParser();
  }

  @AfterAll
  static void tearDown() {
    parser.close();
  }

  @Test
  void should_parse_multiple_time_multiple_language() {
    Program firstSample = parser.parse("var a = 42;");
    assertThat(firstSample.body()).hasSize(1);
    var firstElement = firstSample.body().get(0);
    assertThat(firstElement).isInstanceOfSatisfying(ESTree.VariableDeclaration.class, v -> {
      assertThat(v.declarations()).hasSize(1);
      var declaration = v.declarations().get(0);
      assertThat(declaration).isInstanceOfSatisfying(ESTree.VariableDeclarator.class, d -> {
        assertThat(d.id()).isInstanceOfSatisfying(ESTree.Identifier.class, i ->
          assertThat(i.name()).isEqualTo("a")
        );
        assertThat(d.init().get()).isInstanceOfSatisfying(ESTree.SimpleLiteral.class, l ->
          assertThat(l.value()).isEqualTo(42)
        );
      });
    });
    Program secondSample = parser.parse("let x = <T>42;", "typescript-file.ts");
    assertThat(secondSample.body()).hasSize(1);
  }

  @Test
  void should_throw_exception_when_fail_to_parse_code() {
    assertThatThrownBy(() -> parser.parse("..."))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessage("Failed to parse the code");
  }

  @Test
  void test_empty_configuration() {
    StandaloneParser.EmptyConfiguration emptyConfiguration =
      new StandaloneParser.EmptyConfiguration();
    assertThat(emptyConfiguration.get("key")).isEmpty();
    assertThat(emptyConfiguration.hasKey("key")).isFalse();
    assertThat(emptyConfiguration.getStringArray("key")).isEmpty();
  }

  @Test
  void should_parse_exported_ts_module_declaration() {
    assertExportedNodeIsParsedToCorrectObjectType(
      "export declare module 'foo'",
      ESTree.TSModuleDeclaration.class
    );
  }

  @Test
  void should_parse_exported_ts_type_alias_declaration() {
    assertExportedNodeIsParsedToCorrectObjectType(
      "export type A = { a: 42 }",
      ESTree.TSTypeAliasDeclaration.class
    );
  }

  @Test
  void should_parse_exported_ts_enum_declaration() {
    assertExportedNodeIsParsedToCorrectObjectType(
      "export enum A {}",
      ESTree.TSEnumDeclaration.class
    );
  }

  @Test
  void should_parse_exported_ts_interface_declaration() {
    assertExportedNodeIsParsedToCorrectObjectType(
      "export interface A {}",
      ESTree.TSInterfaceDeclaration.class
    );
  }

  @Test
  void should_parse_exported_ts_declare_function() {
    assertExportedNodeIsParsedToCorrectObjectType(
      "export declare function foo()",
      ESTree.TSDeclareFunction.class
    );
  }

  @Test
  void should_parse_ts_empty_body_function_expression() {
    ESTree.MethodDefinitionOrPropertyDefinitionOrStaticBlock actual = parseClassAndReturnNode(
      "class Foo { bar() }"
    );
    assertThat(actual).isInstanceOfSatisfying(ESTree.MethodDefinition.class, methodDefinition ->
      assertThat(methodDefinition.value()).isInstanceOf(
        ESTree.FunctionExpressionOrTSEmptyBodyFunctionExpression.class
      )
    );
  }

  @Test
  void should_parse_ts_abstract_method_definition() {
    assertThat(parseClassAndReturnNode("class Foo { abstract bar() }")).isInstanceOf(
      ESTree.TSAbstractMethodDefinition.class
    );
  }

  private static <
    T
  > ESTree.MethodDefinitionOrPropertyDefinitionOrStaticBlock parseClassAndReturnNode(String code) {
    Program program = parser.parse(code, "file.ts");
    assertThat(program.body()).hasSize(1);
    assertThat(program.body().get(0)).isInstanceOf(ESTree.ClassDeclaration.class);
    List<ESTree.MethodDefinitionOrPropertyDefinitionOrStaticBlock> bodyClass =
      ((ESTree.ClassDeclaration) program.body().get(0)).body().body();
    assertThat(bodyClass).isNotEmpty();
    return bodyClass.get(0);
  }

  private static <T> void assertExportedNodeIsParsedToCorrectObjectType(
    String code,
    Class<T> nodeType
  ) {
    Program program = parser.parse(code, "file.ts");
    assertThat(program.body()).hasSize(1);
    assertThat(program.body().get(0)).isInstanceOfSatisfying(
      ESTree.ExportNamedDeclaration.class,
      export -> assertThat(export.declaration()).isPresent().get().isInstanceOf(nodeType)
    );
  }
}
