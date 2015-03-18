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
import org.sonar.check.RuleProperty;
import org.sonar.squidbridge.annotations.NoSqale;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.GenericTokenType;

@Rule(
  key = "S104",
  name = "Files should not have too many lines",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
@NoSqale
public class TooManyLinesInFileCheck extends SquidCheck<LexerlessGrammar> {

  private static final int DEFAULT = 1000;

  @RuleProperty(
    key = "maximum",
    defaultValue = "" + DEFAULT)
  public int maximum = DEFAULT;

  @Override
  public void init() {
    subscribeTo(GenericTokenType.EOF);
  }

  @Override
  public void visitNode(AstNode astNode) {
    int lines = astNode.getTokenLine();

    if (lines > maximum) {
      getContext().createFileViolation(this, "File \"{0}\" has {1} lines, which is greater than {2} authorized. Split it into smaller files.",
        getContext().getFile().getName(), lines, maximum);
    }
  }
}

