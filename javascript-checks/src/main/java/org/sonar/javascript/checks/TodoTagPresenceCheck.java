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


import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.squidbridge.annotations.NoSqale;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstAndTokenVisitor;
import com.sonar.sslr.api.Token;

@Rule(
  key = "S1135",
  name = "\"TODO\" tags should be handled",
  priority = Priority.INFO)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.INFO)
@NoSqale
public class TodoTagPresenceCheck extends SquidCheck<LexerlessGrammar> implements AstAndTokenVisitor {

  private static final String PATTERN = "TODO";
  private static final String MESSAGE = "Complete the task associated to this TODO comment.";

  private final CommentContainsPatternChecker checker = new CommentContainsPatternChecker(this, PATTERN, MESSAGE);

  @Override
  public void visitToken(Token token) {
    checker.visitToken(token);
  }

}
