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
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import static org.fest.assertions.Assertions.assertThat;

public class DoubleDispatchVisitorTest {

  @Test
  public void test_visit_token() throws Exception {
    assertNumberOfVisitedTokens("[1, 2, , ,]", 9);
  }

  @Test
  public void test_visit_comment() throws Exception {
    assertNumberOfVisitedComments("// comment1 \n var x = 1;// comment2 \n/*comment3*/", 3);
  }

  @Test
  public void test_field_property() throws Exception {
    assertNumberOfVisitedTokens("class A {static prop = 1; }", 10);
  }

  @Test
  public void jsx() throws Exception {
    assertNumberOfVisitedTokens("<a>Hello {1}</a>", 12);
    assertNumberOfVisitedTokens("<a attr={1}><b {...foo(2)}/></a>", 24);
    assertNumberOfVisitedTokens("<Foo.Bar/>", 7);
  }


  private class TestVisitor extends DoubleDispatchVisitor {
    int tokenCounter;
    int commentCounter;

    @Override
    public void visitScript(ScriptTree tree) {
      tokenCounter = 0;
      commentCounter = 0;
      super.visitScript(tree);
    }

    @Override
    public void visitToken(SyntaxToken token) {
      tokenCounter++;
      super.visitToken(token);
    }

    @Override
    public void visitComment(SyntaxTrivia commentToken) {
      commentCounter++;
      super.visitComment(commentToken);
    }
  }

  private void assertNumberOfVisitedTokens(String code, int expectedLiteralsNumber) {
    assertThat(getTestVisitor(code).tokenCounter).isEqualTo(expectedLiteralsNumber);
  }

  private void assertNumberOfVisitedComments(String code, int expectedLiteralsNumber) {
    assertThat(getTestVisitor(code).commentCounter).isEqualTo(expectedLiteralsNumber);
  }

  private TestVisitor getTestVisitor(String code) {
    ActionParser<Tree> p = JavaScriptParserBuilder.createParser(Charsets.UTF_8);
    TestVisitor testVisitor = new TestVisitor();
    testVisitor.visitScript((ScriptTree) p.parse(code));
    return testVisitor;
  }

}
