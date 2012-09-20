/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.javascript.parser.grammar.expressions;

import com.google.common.base.Charsets;
import com.sonar.sslr.impl.Parser;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.api.EcmaScriptGrammar;
import org.sonar.javascript.parser.EcmaScriptParser;

import static com.sonar.sslr.test.parser.ParserMatchers.parse;
import static org.junit.Assert.assertThat;

public class MemberExpressionTest {

  Parser<EcmaScriptGrammar> p = EcmaScriptParser.create(new EcmaScriptConfiguration(Charsets.UTF_8));
  EcmaScriptGrammar g = p.getGrammar();

  @Before
  public void init() {
    p.setRootRule(g.memberExpression);
  }

  @Test
  public void ok() {
    g.primaryExpression.mock();
    g.functionExpression.mock();
    g.expression.mock();
    g.identifierName.mock();
    g.arguments.mock();

    assertThat(p, parse("primaryExpression"));
    assertThat(p, parse("functionExpression"));

    assertThat(p, parse("primaryExpression [ expression ]"));
    assertThat(p, parse("primaryExpression . identifierName"));
    assertThat(p, parse("primaryExpression [ expression ] . identifierName"));
    assertThat(p, parse("new primaryExpression arguments"));
  }


}
