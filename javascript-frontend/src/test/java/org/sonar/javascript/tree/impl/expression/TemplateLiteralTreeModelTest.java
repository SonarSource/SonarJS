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
package org.sonar.javascript.tree.impl.expression;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;

import static org.assertj.core.api.Assertions.assertThat;

public class TemplateLiteralTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_substitution() throws Exception {
    TemplateLiteralTree tree = parse("` characters `", Kind.TEMPLATE_LITERAL);

    assertThat(tree.is(Kind.TEMPLATE_LITERAL)).isTrue();
    assertThat(tree.openBacktickToken().text()).isEqualTo("`");
    assertThat(tree.strings()).hasSize(1);
    assertThat(tree.strings().get(0).value()).isEqualTo(" characters ");
    assertThat(tree.expressions()).isEmpty();
    assertThat(tree.closeBacktickToken().text()).isEqualTo("`");
  }

  @Test
  public void without_substitution() throws Exception {
    TemplateLiteralTree tree = parse("` characters1 ${ expression1 } characters2 ${ expression2 } characters3 `", Kind.TEMPLATE_LITERAL);

    assertThat(tree.is(Kind.TEMPLATE_LITERAL)).isTrue();
    assertThat(tree.openBacktickToken().text()).isEqualTo("`");

    assertThat(tree.strings()).hasSize(3);
    assertThat(tree.strings().get(0).value()).isEqualTo(" characters1 ");
    assertThat(tree.strings().get(1).value()).isEqualTo(" characters2 ");

    assertThat(tree.expressions()).hasSize(2);

    assertThat(tree.closeBacktickToken().text()).isEqualTo("`");
  }

  @Test
  public void with_escape_and_expression() throws Exception {
    TemplateLiteralTree tree = parse("`\\\\${ expression1 }`", Kind.TEMPLATE_LITERAL);

    assertThat(tree.strings().get(0).value()).isEqualTo("\\\\");
    assertThat(tree.expressions()).hasSize(1);
  }

  @Test
  public void with_escaped_dollar() throws Exception {
    TemplateLiteralTree tree = parse("`\\$`", Kind.TEMPLATE_LITERAL);

    assertThat(tree.strings().get(0).value()).isEqualTo("\\$");
    assertThat(tree.expressions()).hasSize(0);
  }

  @Test
  public void with_escaped_backtick() throws Exception {
    TemplateLiteralTree tree = parse("`\\``", Kind.TEMPLATE_LITERAL);

    assertThat(tree.strings().get(0).value()).isEqualTo("\\`");
    assertThat(tree.expressions()).hasSize(0);
  }
}
