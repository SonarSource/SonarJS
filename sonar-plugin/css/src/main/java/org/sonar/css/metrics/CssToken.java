/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.css.metrics;

import com.sonar.sslr.api.Token;
import com.sonar.sslr.api.TokenType;
import org.sonarsource.analyzer.commons.TokenLocation;

public class CssToken {
  CssTokenType type;
  String text;
  Integer startLine;
  Integer startColumn;
  Integer endLine;
  Integer endColumn;

  public CssToken(Token token) {
    TokenType tokenType = token.getType();
    this.type = (CssTokenType)tokenType;
    this.text = token.getValue();

    TokenLocation tokenLocation = new TokenLocation(token.getLine(), token.getColumn(), token.getValue());
    this.startLine = tokenLocation.startLine();
    this.startColumn = tokenLocation.startLineOffset();
    this.endLine = tokenLocation.endLine();
    this.endColumn = tokenLocation.endLineOffset();
  }
}
