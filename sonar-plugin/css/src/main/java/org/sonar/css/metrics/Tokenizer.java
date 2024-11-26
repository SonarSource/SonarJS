/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.css.metrics;

import com.sonar.sslr.api.Token;
import java.util.ArrayList;
import java.util.List;

public class Tokenizer {

  public List<CssToken> tokenize(String css) {
    List<Token> tokenList = CssLexer.create().lex(css);

    // remove last token (EOF token)
    List<Token> cloneTokenList = new ArrayList<>(tokenList);
    cloneTokenList.remove(cloneTokenList.size() - 1);

    return cloneTokenList.stream().map(CssToken::new).toList();
  }
}
