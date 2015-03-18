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
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "OctalNumber",
  priority = Priority.CRITICAL,
  tags = {Tags.MISRA, Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class OctalNumberCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(EcmaScriptTokenType.NUMERIC_LITERAL);
  }

  @Override
  public void visitNode(AstNode astNode) {
    String value = astNode.getTokenValue();
    if (value.length() > 1 && value.startsWith("0")) {
      int newValue;
      try {
        newValue = Integer.parseInt(value, 8);
      } catch (NumberFormatException e) {
        return;
      }
      getContext().createLineViolation(this, "Replace the value of the octal number (" + value + ") by its decimal equivalent (" + newValue + ").", astNode);
    }
  }

}
