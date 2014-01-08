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
package org.sonar.javascript.checks;

import com.sonar.sslr.api.AstAndTokenVisitor;
import com.sonar.sslr.api.GenericTokenType;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "S104",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class TooManyLinesInFileCheck extends SquidCheck<LexerlessGrammar> implements AstAndTokenVisitor {

  private static final int DEFAULT = 1000;

  @RuleProperty(
    key = "maximum",
    defaultValue = "" + DEFAULT)
  public int maximum = DEFAULT;

  @Override
  public void visitToken(Token token) {
    if (token.getType() == GenericTokenType.EOF) {
      int lines = token.getLine();

      if (lines > maximum) {
        getContext().createFileViolation(this, "This file has {0} lines, which is greater than {1} authorized. Split it into smaller files.", lines, maximum);
      }
    }
  }
}
