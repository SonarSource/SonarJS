/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

import static org.fest.assertions.Assertions.assertThat;

public class DoubleDispatchVisitorTest {

  @Test
  public void jsx() throws Exception {
    assertNumberOfVisitedLiterals("<a>Hello {1}</a>", 1);
    assertNumberOfVisitedLiterals("<a attr={1}><b {...foo(2)}/></a>", 2);
    assertNumberOfVisitedLiterals("<Foo.Bar/>", 0);
  }


  private class TestVisitor extends DoubleDispatchVisitor {

    int literalsCounter;

    @Override
    public void visitScript(ScriptTree tree) {
      literalsCounter = 0;
      super.visitScript(tree);
    }

    @Override
    public void visitLiteral(LiteralTree tree) {
      literalsCounter++;
      super.visitLiteral(tree);
    }
  }

  // todo: We can assert number of tokens after fix of SONARJS-678
  private void assertNumberOfVisitedLiterals(String code, int expectedLiteralsNumber) {
    ActionParser<Tree> p = JavaScriptParserBuilder.createParser(Charsets.UTF_8);
    TestVisitor testVisitor = new TestVisitor();
    testVisitor.visitScript((ScriptTree) p.parse(code));

    assertThat(testVisitor.literalsCounter).isEqualTo(expectedLiteralsNumber);
  }

}
