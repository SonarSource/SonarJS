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
    final String multiLineComment = "<!--\nfoo bar\n-->";
    final String singleLineComment = "<!--foo bar-->";

    assertThat(EcmaScriptLexer.VUE_SCRIPT)
      .matches("<script></script>")
      .matches("<script attr=\"Value\"></script>")
      .matches("  <script>\n   </script>")

      .matches("<script>#!/bin/js\n var i;</script>")
      .matches("<script>i = 42;</script>")
      .matches("<script>\nvar i;</script>")
      .matches("<script> var i;</script>")
      .notMatches("<script>foo var invalid;</script>")

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

      .matches(multiLineComment + "<script>var i;</script>")
      .matches("<script>var i;</script>" + multiLineComment)
      .matches(singleLineComment + "<script>var i;</script>")
      .matches("<script>var i;</script>" + singleLineComment)
      .matches(styleWithCss + multiLineComment + componentTemplate + "<script>var i;</script>")
      .matches(multiLineComment + componentTemplate + multiLineComment + "<script>var i;</script>")
      .matches(multiLineComment + styleWithCss + multiLineComment + componentTemplate + multiLineComment + "<script>var i;</script>")
      .matches(multiLineComment + componentTemplate + singleLineComment + "<script>var i;</script>")
      .matches(multiLineComment + "<docs>This is a documentation block</docs>" + "<script>var i;</script>")
      .matches(multiLineComment + "\n\n<script>var i;</script>")
      .matches("<!--\nfoo bar\n\n\n-->" + multiLineComment + "\n\n<script>var i;</script>")
      .matches("<script>foo(42);\n/* js comment */</script>")
    ;
  }

  @Test
  public void vue_file_with_script_section_language() throws Exception {
    final String ts = "class Foo {\nprivate message: string\n}";

    assertThat(EcmaScriptLexer.SCRIPT_SECTION_TS)
      .matches("<script lang=\"ts\">" + ts + "</script>")
      .notMatches("<script lang=\"js\">" + ts + "</script>")
      .matches("<script lang=\"ts\"  >" + ts + "</script>")
      .notMatches("<script lang=\"js\">lang=\"ts\"</script>")
      .matches("<script lang=\"ts\">lang=\"js\"</script>")
      .matches("<script lang=\"ts\"><script lang=\"js\"></script></script>")
      .notMatches("<script lang=\"js\">var a = `<script lang=\"ts\"></script>`</script>")
    ;
  }

  @Test
  public void vue_file_with_custom_sections() throws Exception {
    final String customSectionDoc = "<docs>This is a doc</docs>";
    final String customSectionI18n = "<i18n>{ \"en-US\": { \"foo\": \"bar\"}  }</i18n>";
    final String styleWithCss = "<style>h1, h2 { \nfont-weight: normal; \n}</style>";
    final String componentTemplate = "<template> <div id=\"app\">\n </div> </template>";

    String script = "<script>var i;</script>";
    assertThat(EcmaScriptLexer.VUE_SCRIPT)
      .matches(customSectionDoc)
      .matches("<docs foo=\"bar\">this is a doc</docs>")
      .matches("<scripts>This is a custom tag</scripts>" + script)
      .matches(script + customSectionDoc)
      .matches(styleWithCss + componentTemplate + customSectionDoc + script)
      .matches(styleWithCss + componentTemplate + customSectionI18n + script)
      .matches("<example src=\"foo\" />" + styleWithCss + componentTemplate + customSectionI18n + script)
      .matches("<example src=\"foo\" />")
      .notMatches("<example src=\"foo\">foo bar </example42>")
      .matches("<example/>")
      .matches(styleWithCss + "<example src=\"foo\" />" + script)
      .notMatches(script + "invalid syntax")
    ;
  }

}
