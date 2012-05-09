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
package org.sonar.plugins.javascript.cpd;

import java.io.FileNotFoundException;
import java.io.IOException;

import net.sourceforge.pmd.cpd.SourceCode;
import net.sourceforge.pmd.cpd.TokenEntry;
import net.sourceforge.pmd.cpd.Tokenizer;
import net.sourceforge.pmd.cpd.Tokens;

import org.antlr.runtime.ANTLRFileStream;
import org.antlr.runtime.Token;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.cpd.antlr.ES3Lexer;

public class JavaScriptTokenizer implements Tokenizer {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptTokenizer.class);

  public final void tokenize(SourceCode source, Tokens cpdTokens) {
    String fileName = source.getFileName();
    Token token;
    ES3Lexer lexer;

    try {
      lexer = new ES3Lexer(new ANTLRFileStream(fileName));

      token = lexer.nextToken();
      while (token.getType() != Token.EOF) {
        cpdTokens.add(new TokenEntry(token.getText(), fileName, token.getLine()));
        token = lexer.nextToken();
      }
    }

    catch (FileNotFoundException fnfe) {
      LOG.error("File not found", fnfe);
    } catch (IOException e) {
      LOG.error("Cannot read file", e);
    }

    cpdTokens.add(TokenEntry.getEOF());
  }
}
