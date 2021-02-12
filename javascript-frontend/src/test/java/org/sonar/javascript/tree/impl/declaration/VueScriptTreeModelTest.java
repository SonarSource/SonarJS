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
package org.sonar.javascript.tree.impl.declaration;

import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.parser.JavaScriptParserBuilder.createVueParser;

public class VueScriptTreeModelTest extends JavaScriptTreeModelTest {

  private static final ActionParser<Tree> p = createVueParser();

  @Test
  public void without_script_tag() throws Exception {
    ScriptTree tree = parse("<template></template>  \n  <style></style>", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items()).isNull();
    assertThat(tree.EOFToken()).isNotNull();
    assertThat(tree.EOFToken().line()).isEqualTo(2);
  }

  @Test
  public void with_empty_script_tag() throws Exception {
    ScriptTree tree = parse("<template></template>\n<script></script>\n<style></style>", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items()).isNull();
    assertThat(tree.EOFToken()).isNotNull();
    assertThat(tree.EOFToken().line()).isEqualTo(3);
  }

  @Test
  public void with_statement() throws Exception {
    ScriptTree tree = parse("<template><div>Hello, {{userName}}</div></template> <script>var i; var j;</script>", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items().items()).hasSize(2);
    assertThat(tree.EOFToken()).isNotNull();
  }

  @Test
  public void with_shebang() throws Exception {
    ScriptTree tree = parse("<script>#!/bin/js\nvar i;</script>", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken().text()).isEqualTo("#!/bin/js");
    assertThat(tree.items().items()).hasSize(1);
    assertThat(tree.EOFToken()).isNotNull();
  }

  @Test
  public void with_attribute() throws Exception {
    ScriptTree tree = parse("<script attr=\"Value\"></script>", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.items()).isNull();
  }

  @Test
  public void without_explicit_end_of_statement_token() throws Exception {
    final ScriptTree treeWithEos = parse("<script>var x</script>", Kind.SCRIPT);

    assertThat(treeWithEos.is(Kind.SCRIPT)).isTrue();
    assertThat(treeWithEos.items().items()).hasSize(1);

    final ScriptTree treeWithEosNoLB = parse("<script>return</script>", Kind.SCRIPT);

    assertThat(treeWithEosNoLB.is(Kind.SCRIPT)).isTrue();
    assertThat(treeWithEosNoLB.items().items()).hasSize(1);
  }

  @Test
  public void with_lang_property() throws Exception {
    ScriptTree scriptLangJs = parse("<script lang=\"js\">var i</script>", Kind.SCRIPT);

    assertThat(scriptLangJs.is(Kind.SCRIPT)).isTrue();
    assertThat(scriptLangJs.items().items()).hasSize(1);
    VariableDeclarationTree variableDeclarationTree = (VariableDeclarationTree) getFirstDescendant((JavaScriptTree) scriptLangJs, Kind.VAR_DECLARATION);
    assertThat(variableDeclarationTree.is(Kind.VAR_DECLARATION)).isTrue();

    // when lang = ts, script content is ignored
    ScriptTree scriptLangTs = parse("<script lang=\"ts\">var i</script>", Kind.SCRIPT);

    assertThat(scriptLangTs.is(Kind.SCRIPT)).isTrue();
    assertThat(scriptLangTs.items()).isNull();
  }

  @Test
  public void with_custom_sections() throws Exception {
    String customSectionDoc = "<docs>This is a doc</docs>";
    ScriptTree vueTree = (ScriptTree) p.parse(customSectionDoc);
    assertThat(vueTree.items()).isNull();

    vueTree = (ScriptTree) p.parse(customSectionDoc + "<script>var x</script>");
    assertThat(vueTree.items().items()).hasSize(1);
    VariableDeclarationTree variableDeclarationTree = (VariableDeclarationTree) getFirstDescendant((JavaScriptTree) vueTree, Kind.VAR_DECLARATION);
    assertThat(variableDeclarationTree.is(Kind.VAR_DECLARATION)).isTrue();
  }

  @Test
  public void with_multiline_comment() throws Exception {
    ScriptTree vueWithComment = parse("<!--\n multiline comment \n--><script lang=\"js\">var i</script>", Kind.SCRIPT);
    assertThat(vueWithComment.is(Kind.SCRIPT)).isTrue();
    assertThat(vueWithComment.items().items()).hasSize(1);
    VariableDeclarationTree variableDeclarationTree = (VariableDeclarationTree) getFirstDescendant((JavaScriptTree) vueWithComment, Kind.VAR_DECLARATION);
    assertThat(variableDeclarationTree.is(Kind.VAR_DECLARATION)).isTrue();

    vueWithComment = parse("<script>foo(42);\n/* js comment */</script>", Kind.SCRIPT);
    assertThat(vueWithComment.is(Kind.SCRIPT)).isTrue();
    assertThat(vueWithComment.items().items()).hasSize(1);
    CallExpressionTree callExpressionTree = (CallExpressionTree) getFirstDescendant((JavaScriptTree) vueWithComment, Kind.CALL_EXPRESSION);
    assertThat(callExpressionTree.is(Kind.CALL_EXPRESSION)).isTrue();
  }

  @Override
  protected <T extends Tree> T parse(String s, Kind descendantToReturn) throws Exception {
    Tree node = p.parse(s);
    // we don't keep in syntax tree all content of the file ("template" and "style" sections)
    // checkFullFidelity(node, s);
    return (T) getFirstDescendant((JavaScriptTree) node, descendantToReturn);
  }
}
