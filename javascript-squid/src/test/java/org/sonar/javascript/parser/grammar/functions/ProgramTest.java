/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.parser.grammar.functions;

import com.google.common.base.Joiner;
import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptGrammar;

import static org.sonar.javascript.sslr.tests.Assertions.assertThat;

public class ProgramTest {


  @Test
  public void realLife() {
    assertThat(EcmaScriptGrammar.SCRIPT)
        .matches("{}")
        .matches("var a;")
        .matches("if (true) {}")
        .matches("document.write(\"Hello world\");")
        .matches("var r = /^\\s+/;")
        .matches("function func() { doSomething() }");

    assertThat(EcmaScriptGrammar.SCRIPT).matches(code(
      "#!/usr/bin/env node",
      "function func() { }"));

    assertThat(EcmaScriptGrammar.SCRIPT).matches("\uFEFF");

    // http://www.w3schools.com/js/tryit.asp?filename=tryjs_ifthenelse
    assertThat(EcmaScriptGrammar.SCRIPT).matches(code(
      "var d = new Date();",
      "var time = d.getHours();",
      "if (time < 10) {",
      "  document.write(\"Good morning\");",
      "} else {",
      "  document.write(\"Good day\");",
      "}"));
  }

  private static String code(String... lines) {
    return Joiner.on("\n").join(lines);
  }

}
