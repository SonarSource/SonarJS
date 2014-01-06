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
package org.sonar.plugins.javascript.colorizer;

import com.google.common.collect.ImmutableList;
import org.sonar.api.web.CodeColorizerFormat;
import org.sonar.colorizer.*;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.plugins.javascript.core.JavaScript;

import java.util.List;

public class JavaScriptColorizerFormat extends CodeColorizerFormat {

  public JavaScriptColorizerFormat() {
    super(JavaScript.KEY);
  }

  @Override
  public List<Tokenizer> getTokenizers() {
    return ImmutableList.of(
        new StringTokenizer("<span class=\"s\">", "</span>"),
        new CDocTokenizer("<span class=\"cd\">", "</span>"),
        new JavadocTokenizer("<span class=\"cppd\">", "</span>"),
        new CppDocTokenizer("<span class=\"cppd\">", "</span>"),
        new HtmlCommentTokenizer("<span class=\"cd\">", "</span>"),
        new KeywordsTokenizer("<span class=\"k\">", "</span>", EcmaScriptKeyword.keywordValues()));
  }

}
