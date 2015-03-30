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
package org.sonar.plugins.javascript.highlighter;

import com.sonar.sslr.api.GenericTokenType;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.api.TokenType;
import com.sonar.sslr.api.Trivia;
import com.sonar.sslr.impl.Lexer;
import org.sonar.api.source.Highlightable;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.lexer.EcmaScriptLexer;

import java.io.File;
import java.nio.charset.Charset;
import java.util.List;

public class JavaScriptHighlighter {

  private Lexer lexer;
  private Charset charset;

  public JavaScriptHighlighter(EcmaScriptConfiguration conf){
    this.lexer = EcmaScriptLexer.create(conf);
    this.charset = conf.getCharset();
  }

  public void highlight(Highlightable highlightable, File file) {
    SourceFileOffsets offsets = new SourceFileOffsets(file, charset);
    List<Token> tokens = lexer.lex(file);
    doHighlight(highlightable, tokens, offsets);
  }

  public void highlight(Highlightable highlightable, String string) {
    SourceFileOffsets offsets = new SourceFileOffsets(string);
    List<Token> tokens = lexer.lex(string);
    doHighlight(highlightable, tokens, offsets);
  }

  private void doHighlight(Highlightable highlightable, List<Token> tokens, SourceFileOffsets offsets) {
    Highlightable.HighlightingBuilder highlighting = highlightable.newHighlighting();
    highlightStringsAndKeywords(highlighting, tokens, offsets);
    highlightComments(highlighting, tokens, offsets);
    highlighting.done();
  }

  private void highlightComments(Highlightable.HighlightingBuilder highlighting, List<Token> tokens, SourceFileOffsets offsets) {
    for (Token token : tokens) {
      if (!token.getTrivia().isEmpty()) {
        for (Trivia trivia : token.getTrivia()) {
          highlight(highlighting, offsets.startOffset(trivia.getToken()), offsets.endOffset(trivia.getToken()), "cd");
        }
      }
    }
  }

  private void highlightStringsAndKeywords(Highlightable.HighlightingBuilder highlighting, List<Token> tokens, SourceFileOffsets offsets) {
    for (Token token : tokens) {
      if (GenericTokenType.LITERAL.equals(token.getType())) {
        highlight(highlighting, offsets.startOffset(token), offsets.endOffset(token), "s");
      }
      if (isKeyword(token.getType())) {
        highlight(highlighting, offsets.startOffset(token), offsets.endOffset(token), "k");
      }
    }
  }

  private static void highlight(Highlightable.HighlightingBuilder highlighting, int startOffset, int endOffset, String code) {
    if (endOffset > startOffset) {
      highlighting.highlight(startOffset, endOffset, code);
    }
  }

  public boolean isKeyword(TokenType type) {
    for (TokenType keywordType : EcmaScriptKeyword.values()) {
      if (keywordType.equals(type)) {
        return true;
      }
    }
    return false;
  }
}
