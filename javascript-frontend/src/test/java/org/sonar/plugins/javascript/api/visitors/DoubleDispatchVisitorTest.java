/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.api.visitors;

import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import static org.assertj.core.api.Assertions.assertThat;

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
    assertNumberOfVisitedTokens("<>Hello</>", 7);
    assertNumberOfVisitedTokens("<a attr={1}><b {...foo(2)}/></a>", 24);
    assertNumberOfVisitedTokens("<Foo.Bar/>", 7);
  }

  @Test
  public void flow() throws Exception {
    assertNumberOfVisitedTokens("var x: {p1?:number, [p2]:number}", 16);
    assertNumberOfVisitedTokens("var x: ?number", 6);
    assertNumberOfVisitedTokens("var x: Array<number[]>", 10);
    assertNumberOfVisitedTokens("var x: (Type)", 7);
    assertNumberOfVisitedTokens("var x: [Type1, Type2]", 9);
    assertNumberOfVisitedTokens("let x: 1 = 1", 7);
    assertNumberOfVisitedTokens("let x: | A | B", 8);
    assertNumberOfVisitedTokens("let x: & A & B", 8);
    assertNumberOfVisitedTokens("var x: (p?: number, ...MyArrayType) => void", 15);
    assertNumberOfVisitedTokens("x = function(p?) { }", 10);
    assertNumberOfVisitedTokens("type A<T> = number", 8);
    assertNumberOfVisitedTokens("var x: MyType<number>", 8);
    assertNumberOfVisitedTokens("type A = number", 5);
    assertNumberOfVisitedTokens("var x: typeof MyType", 6);
    assertNumberOfVisitedTokens("(x: MyType)", 6);
    assertNumberOfVisitedTokens("declare module A {}", 6);
    assertNumberOfVisitedTokens("declare module.exports: MyType", 7);
    assertNumberOfVisitedTokens("declare function foo(): void", 8);
    assertNumberOfVisitedTokens("declare opaque type A", 5);
    assertNumberOfVisitedTokens("interface A { foo():void }", 10);
  }

  @Test
  public void assignment_pattern() throws Exception {
    assertNumberOfVisitedTokens("[a, ...b] = arr", 9);
    assertNumberOfVisitedTokens("({a: a1, b = 1} = obj)", 14);
  }

  @Test
  public void export_declaration() throws Exception {
    assertNumberOfVisitedTokens("export A from 'mod'", 5);
    assertNumberOfVisitedTokens("export A, * as B from 'mod'", 9);
    assertNumberOfVisitedTokens("export A, {B as BB} from 'mod'", 11);
    assertNumberOfVisitedTokens("export default class A {};", 8);
    assertNumberOfVisitedTokens("export * from 'mod';", 6);
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

  private void assertNumberOfVisitedTokens(String code, int expectedTokenNumber) {
    assertThat(getTestVisitor(code).tokenCounter).isEqualTo(expectedTokenNumber);
  }

  private void assertNumberOfVisitedComments(String code, int expectedCommentNumber) {
    assertThat(getTestVisitor(code).commentCounter).isEqualTo(expectedCommentNumber);
  }

  private TestVisitor getTestVisitor(String code) {
    ActionParser<Tree> p = JavaScriptParserBuilder.createParser();
    TestVisitor testVisitor = new TestVisitor();
    testVisitor.visitScript((ScriptTree) p.parse(code));
    return testVisitor;
  }

}
