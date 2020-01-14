/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.SpreadElementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class SpreadElementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void spread_element() throws Exception {
    SpreadElementTree tree = parse("var x = [1, ... expression];", Kind.SPREAD_ELEMENT);

    assertThat(tree.is(Kind.SPREAD_ELEMENT)).isTrue();
    assertThat(tree.ellipsisToken().text()).isEqualTo(JavaScriptPunctuator.ELLIPSIS.getValue());
    assertThat(tree.element().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
  }

}
