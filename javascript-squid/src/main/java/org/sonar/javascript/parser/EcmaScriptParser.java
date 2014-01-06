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

import com.sonar.sslr.impl.Parser;
import com.sonar.sslr.impl.events.ParsingEventListener;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.sslr.parser.LexerlessGrammar;
import org.sonar.sslr.parser.ParserAdapter;

public final class EcmaScriptParser {

  private EcmaScriptParser() {
  }

  public static Parser<LexerlessGrammar> create(EcmaScriptConfiguration conf, ParsingEventListener... parsingEventListeners) {
    return new ParserAdapter<LexerlessGrammar>(conf.getCharset(), EcmaScriptGrammar.createGrammar());
  }

}
