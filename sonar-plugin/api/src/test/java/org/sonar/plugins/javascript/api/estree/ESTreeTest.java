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
package org.sonar.plugins.javascript.api.estree;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ESTreeTest {

  @Test
  void test() {
    Class<?>[] classes = ESTree.class.getDeclaredClasses();
    assertThat(classes).hasSize(113);

    //filter all classes that are interface
    var ifaceCount = Arrays.stream(classes).filter(Class::isInterface).count();
    assertThat(ifaceCount).isEqualTo(27);

    var recordCount = Arrays.stream(classes).filter(Class::isRecord).count();
    assertThat(recordCount).isEqualTo(81);
  }

  @Test
  void test_node_subclasses() {
    Class<?> sealedClass = ESTree.Node.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(24);
  }

  @Test
  void test_expression_subclasses() {
    Class<?> sealedClass = ESTree.Expression.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(25);
  }

  @Test
  void test_statement_subclasses() {
    Class<?> sealedClass = ESTree.Statement.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(22);
  }

  @Test
  void unary_operator_from_should_return_correct_enum() {
    assertThat(ESTree.UnaryOperator.from("-")).isEqualTo(ESTree.UnaryOperator.MINUS);
    assertThat(ESTree.UnaryOperator.from("unknown")).isNull();
  }

  @Test
  void binary_operator_from_should_return_correct_enum() {
    assertThat(ESTree.BinaryOperator.from("+")).isEqualTo(ESTree.BinaryOperator.PLUS);
    assertThat(ESTree.BinaryOperator.from("unknown")).isNull();
  }

  @Test
  void logical_operator_from_should_return_correct_enum() {
    assertThat(ESTree.LogicalOperator.from("&&")).isEqualTo(ESTree.LogicalOperator.AND);
    assertThat(ESTree.LogicalOperator.from("unknown")).isNull();
  }

  @Test
  void assignment_operator_from_should_return_correct_enum() {
    assertThat(ESTree.AssignmentOperator.from("=")).isEqualTo(ESTree.AssignmentOperator.ASSIGN);
    assertThat(ESTree.AssignmentOperator.from("unknown")).isNull();
  }

  @Test
  void update_operator_from_should_return_correct_enum() {
    assertThat(ESTree.UpdateOperator.from("++")).isEqualTo(ESTree.UpdateOperator.INCREMENT);
    assertThat(ESTree.UpdateOperator.from("unknown")).isNull();
  }
}
