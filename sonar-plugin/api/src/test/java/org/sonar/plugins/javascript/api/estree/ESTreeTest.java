package org.sonar.plugins.javascript.api.estree;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ESTreeTest {

  @Test
  void test() {

    Class<?>[] classes = ESTree.class.getDeclaredClasses();
    assertThat(classes).hasSize(106);

    //filter all classes that are interface
    var ifaceCount = Arrays.stream(classes).filter(Class::isInterface).count();
    assertThat(ifaceCount).isEqualTo(25);

    var recordCount = Arrays.stream(classes).filter(Class::isRecord).count();
    assertThat(recordCount).isEqualTo(76);
  }

  @Test
  void test_node_subclasses() {
    Class<?> sealedClass = ESTree.Node.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(23);
  }

  @Test
  void test_expression_subclasses() {
    Class<?> sealedClass = ESTree.Expression.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(24);
  }

  @Test
  void test_statement_subclasses() {
    Class<?> sealedClass = ESTree.Statement.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(20);
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
