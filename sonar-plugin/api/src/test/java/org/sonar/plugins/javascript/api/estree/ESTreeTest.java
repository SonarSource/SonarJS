package org.sonar.plugins.javascript.api.estree;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.api.estree.ESTree.Node;
import org.sonar.plugins.javascript.api.estree.ESTree.Program;

class ESTreeTest {

  @Test
  void test() {
    Node p = new Program("", null);

    switch (p) {

    }
  }

}
