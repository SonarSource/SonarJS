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
package org.sonar.javascript.parser;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.Rule;
import com.sonar.sslr.impl.Parser;
import com.sonar.sslr.impl.matcher.RuleDefinition;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.ast.parser.TreeFactory;
import com.sonar.sslr.api.typed.ActionParser;
import com.sonar.sslr.api.typed.AstNodeBuilder;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.io.File;
import java.util.List;

public final class EcmaScriptParser extends Parser<LexerlessGrammar> {

  private final ActionParser<AstNode> actionParser;

  private EcmaScriptParser(ActionParser<AstNode> actionParser) {
    super(null);
    this.actionParser = actionParser;
  }

  public static Parser<LexerlessGrammar> create(EcmaScriptConfiguration conf) {
    ActionParser<AstNode> actionParser = new ActionParser<AstNode>(
      conf.getCharset(),
      EcmaScriptGrammar.createGrammarBuilder(),
      ActionGrammar.class,
      new TreeFactory(),
      new AstNodeBuilder(),
      EcmaScriptGrammar.SCRIPT);
    return new EcmaScriptParser(actionParser);
  }

  @Override
  public AstNode parse(List tokens) {
    throw new UnsupportedOperationException();
  }

  @Override
  public AstNode parse(File file) {
    return actionParser.parse(file);
  }

  @Override
  public AstNode parse(String source) {
    return actionParser.parse(source);
  }

  @Override
  public void setRootRule(Rule rootRule) {
    throw new UnsupportedOperationException();
  }

  @Override
  public RuleDefinition getRootRule() {
    throw new UnsupportedOperationException();
  }

}
