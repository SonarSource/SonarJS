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
package org.sonar.javascript.parser.expressions.jsx;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class JsxElementTest {

  @Test
  public void standard() {
    assertThat(EcmaScriptLexer.JSX_ELEMENT)
      .matches("<c><a><b></b></a></c>")
      .matches("<foo></foo>")
      .matches("<foo><bar></bar></foo>")
      .matches("<foo>hello world!</foo>")
      .matches("<foo>{foo()}</foo>")

      .notMatches("<foo></bar></foo>")
      ;
  }

  @Test
  public void self_closing() {
    assertThat(Kind.JSX_SELF_CLOSING_ELEMENT)
      .matches("<foo/>")
      .matches("<foo attr1='value'/>")
      .matches("<this.bar/>")
      .matches("<Foo.bar.foobar/>")
    ;
  }

  @Test
  public void element_name() throws Exception {
    assertThat(Kind.JSX_SELF_CLOSING_ELEMENT)
      .matches("<Foo />")
      .matches("<foo />")
      .matches("<this />")
      .matches("<foo.bar />")
      .matches("<foo.Bar />")
    ;
  }

  @Test
  public void short_fragment_syntax() throws Exception {
    assertThat(EcmaScriptLexer.JSX_ELEMENT)
      .matches("<> </>")
      .matches("<> Hello </>")
      .matches("<> <div/><div/> </>")
      .matches("<> <div>Hello</div> world </>")

      .notMatches("<attr='value'> </>")
    ;
  }
}
