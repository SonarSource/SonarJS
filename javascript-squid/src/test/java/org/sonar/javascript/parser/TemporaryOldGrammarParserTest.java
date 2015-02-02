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
package org.sonar.javascript.parser;

import com.google.common.base.Charsets;
import org.junit.Before;
import org.sonar.javascript.ast.parser.TreeFactory;
import org.sonar.javascript.parser.ActionGrammar;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.javascript.parser.sslr.ActionParser2;
import org.sonar.sslr.grammar.LexerlessGrammarBuilder;
import org.sonar.sslr.parser.LexerlessGrammar;

public class TemporaryOldGrammarParserTest {

  protected LexerlessGrammar g;

  @Before
  public void setUp() throws Exception {
    LexerlessGrammarBuilder b = EcmaScriptGrammar.createGrammarBuilder();
    // Only called to conpleted the grammar
    new ActionParser2(Charsets.UTF_8, b, ActionGrammar.class, new TreeFactory(), EcmaScriptGrammar.SPACING_NO_LB);
    g = b.build();
  }

}
