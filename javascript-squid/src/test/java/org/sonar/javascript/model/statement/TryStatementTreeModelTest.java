/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.model.statement;

import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.TryStatementTree;

import static org.fest.assertions.Assertions.assertThat;

public class TryStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void try_catch() throws Exception {
   TryStatementTree tree = parse("try { } catch (e) { 0}", Kind.TRY_STATEMENT);

    assertThat(tree.is(Kind.TRY_STATEMENT)).isTrue();
    assertThat(tree.tryKeyword().text()).isEqualTo(EcmaScriptKeyword.TRY.getValue());
    assertThat(tree.block()).isNotNull();
    assertThat(tree.catchBlock()).isNotNull();

    assertThat(tree.finallyKeyword()).isNull();
    assertThat(tree.finallyBlock()).isNull();

  }

  @Test
  public void try_finally() throws Exception {
    TryStatementTree tree = parse("try { } finally { }", Kind.TRY_STATEMENT);

    assertThat(tree.is(Kind.TRY_STATEMENT)).isTrue();
    assertThat(tree.tryKeyword().text()).isEqualTo(EcmaScriptKeyword.TRY.getValue());
    assertThat(tree.block()).isNotNull();
    assertThat(tree.finallyKeyword().text()).isEqualTo(EcmaScriptKeyword.FINALLY.getValue());
    assertThat(tree.finallyBlock()).isNotNull();

    assertThat(tree.catchBlock()).isNull();
  }

  @Test
  public void try_catch_finally() throws Exception {
    TryStatementTree tree = parse("try { } catch (e) { } finally { }", Kind.TRY_STATEMENT);

    assertThat(tree.is(Kind.TRY_STATEMENT)).isTrue();
    assertThat(tree.tryKeyword().text()).isEqualTo(EcmaScriptKeyword.TRY.getValue());
    assertThat(tree.block()).isNotNull();
    assertThat(tree.finallyKeyword().text()).isEqualTo(EcmaScriptKeyword.FINALLY.getValue());
    assertThat(tree.finallyBlock()).isNotNull();
    assertThat(tree.catchBlock()).isNotNull();
  }

}
