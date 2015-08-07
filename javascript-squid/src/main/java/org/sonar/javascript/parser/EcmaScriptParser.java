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

import com.sonar.sslr.api.typed.ActionParser;
import org.sonar.javascript.ast.parser.JavaScriptNodeBuilder;
import org.sonar.javascript.ast.parser.TreeFactory;
import org.sonar.plugins.javascript.api.tree.Tree;

import java.nio.charset.Charset;

public final class EcmaScriptParser {

  private EcmaScriptParser(){
  }

  public static ActionParser<Tree> createParser(Charset charset) {
    return new ActionParser<>(
      charset,
      EcmaScriptGrammar.createGrammarBuilder(),
      ActionGrammar.class,
      new TreeFactory(),
      new JavaScriptNodeBuilder(),
      EcmaScriptGrammar.SCRIPT);
  }

}
