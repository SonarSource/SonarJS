package org.sonar.plugins.javascript.api.estree;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ESTreeTest {

  @Test
  void test() {

    Class<?>[] classes = ESTree.class.getDeclaredClasses();
    assertThat(classes).hasSize(107);

    //filter all classes that are interface
    var ifaceCount = Arrays.stream(classes).filter(Class::isInterface).count();
    assertThat(ifaceCount).isEqualTo(24);

    var recordCount = Arrays.stream(classes).filter(Class::isRecord).count();
    assertThat(recordCount).isEqualTo(78);
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
    assertThat(permittedSubclasses).hasSize(25);
  }

  @Test
  void test_statement_subclasses() {
    Class<?> sealedClass = ESTree.Statement.class;
    Class<?>[] permittedSubclasses = sealedClass.getPermittedSubclasses();
    assertThat(permittedSubclasses).hasSize(20);
  }

}
