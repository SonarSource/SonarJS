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

import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "S138",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class TooManyLinesInFunctionCheck extends SquidCheck<LexerlessGrammar> {
  private static final int DEFAULT = 100;

  @RuleProperty(
    key = "max",
    defaultValue = "" + DEFAULT)
  public int max = DEFAULT;

  @Override
  public void init() {
    subscribeTo(EcmaScriptGrammar.METHOD,
      EcmaScriptGrammar.GENERATOR_METHOD,
      EcmaScriptGrammar.GENERATOR_DECLARATION,
      EcmaScriptGrammar.GENERATOR_EXPRESSION,
      EcmaScriptGrammar.FUNCTION_DECLARATION,
      EcmaScriptGrammar.FUNCTION_EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    int nbLines = getNumberOfLine(astNode);
    if (nbLines > max) {
      getContext().createLineViolation(this, "This function has {0} lines, which is greater than the {1} lines authorized. Split it into smaller functions.",
        astNode, nbLines, max);
    }
  }

  public static int getNumberOfLine(AstNode functionNode) {
    int firstLine = functionNode.getFirstChild(EcmaScriptPunctuator.LCURLYBRACE).getTokenLine();
    int lastLine = functionNode.getFirstChild(EcmaScriptPunctuator.RCURLYBRACE).getTokenLine();

    return lastLine - firstLine + 1;
  }
}
