/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.parser.declarations.module;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ScriptTest {

  @Test
  public void simple_script() {
    assertThat(EcmaScriptLexer.SCRIPT)
      .matches("var i;")
      .matches("import {x} from 'myModule';")
      .matches("foo();")
      .matches("#!/bin/js\n" +
        "var i;");
  }

  @Test
  public void vue_file() throws Exception {
    final String styleWithCss = "<style>h1, h2 { \nfont-weight: normal; \n}</style>";
    final String componentTemplate = "<template> <div id=\"app\">\n </div> </template>";
    final String componentTemplateWithScript = "<template> <script></script> </template>";

    assertThat(EcmaScriptLexer.VUE_SCRIPT)
      .matches("<script></script>")
      .matches("<script attr=\"Value\"></script>")
      .matches("  <script>\n   </script>")

      .matches("<script>#!/bin/js\n var i;</script>")
      .matches("<script>i = 42;</script>")
      .matches("<script>\nvar i;</script>")
      .matches("<script> var i;</script>")

      .matches("<template></template>\n<script></script>")
      .matches("<template>foo bar</template>\n<script></script>")
      .matches("<template lang=\"pug\"></template>")
      .matches("<style lang=\"scss\" scoped></style>")

      .matches("<template></template>")
      .matches("<style></style>")

      .matches(componentTemplateWithScript + "<script>var i;</script>" + styleWithCss)

      .matches(componentTemplate + "<script>var i;</script>" + styleWithCss)

      .matches(componentTemplate + styleWithCss + "<script>var i;</script>")
      .matches("<script>var i;</script>" + componentTemplate + styleWithCss)
      .matches("<script>var i;</script>" + styleWithCss + componentTemplate)
      .matches(styleWithCss + "<script>var i;</script>" + componentTemplate)
      .matches(styleWithCss + componentTemplate + "<script>var i;</script>")
    ;
  }

}
