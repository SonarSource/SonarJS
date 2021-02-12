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
package org.sonar.javascript.utils;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.typed.ActionParser;
import com.sonar.sslr.api.typed.AstNodeBuilder;
import org.junit.Before;
import org.sonar.javascript.parser.JavaScriptGrammar;
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.javascript.parser.TreeFactory;
import org.sonar.sslr.grammar.LexerlessGrammarBuilder;
import org.sonar.sslr.parser.LexerlessGrammar;

public abstract class LegacyParserTest {

  protected LexerlessGrammar g;

  @Before
  public void setUp() throws Exception {
    LexerlessGrammarBuilder b = EcmaScriptLexer.createGrammarBuilder();
    // Only called to conpleted the grammar
    new ActionParser<AstNode>(Charsets.UTF_8, b, JavaScriptGrammar.class, new TreeFactory(), new AstNodeBuilder(), EcmaScriptLexer.SPACING_NO_LB);
    g = b.build();
  }

}
