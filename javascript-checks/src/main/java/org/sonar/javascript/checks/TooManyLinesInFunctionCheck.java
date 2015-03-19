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

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.NoSqale;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S138",
  name = "Functions should not have too many lines",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@NoSqale
public class TooManyLinesInFunctionCheck extends SquidCheck<LexerlessGrammar> {
  private static final int DEFAULT = 100;

  @RuleProperty(
    key = "max",
    description = "Maximum authorized lines in a function",
    defaultValue = "" + DEFAULT)
  public int max = DEFAULT;

  @Override
  public void init() {
    subscribeTo(
      Kind.METHOD,
      Kind.GENERATOR_METHOD,
      Kind.GENERATOR_DECLARATION,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    int nbLines = getNumberOfLine(astNode);
    if (nbLines > max && !isImmediatelyInvokedFunctionExpression(astNode)) {
      getContext().createLineViolation(this, "This function has {0} lines, which is greater than the {1} lines authorized. Split it into smaller functions.",
        astNode, nbLines, max);
    }
  }

  private boolean isImmediatelyInvokedFunctionExpression(AstNode functionDec) {
    AstNode rcurly = functionDec.getFirstChild(Kind.BLOCK).getFirstChild(EcmaScriptPunctuator.RCURLYBRACE);
    AstNode nextAstNode = rcurly.getNextAstNode();

    return functionDec.is(Kind.GENERATOR_FUNCTION_EXPRESSION, Kind.FUNCTION_EXPRESSION)
      && (nextAstNode.is(Kind.ARGUMENTS) || nextAstNode.is(EcmaScriptPunctuator.RPARENTHESIS) && nextAstNode.getNextAstNode().is(Kind.ARGUMENTS));
  }

  public static int getNumberOfLine(AstNode functionNode) {
    AstNode block = functionNode.getFirstChild(Kind.BLOCK);

    int firstLine = block.getFirstChild(EcmaScriptPunctuator.LCURLYBRACE).getTokenLine();
    int lastLine = block.getFirstChild(EcmaScriptPunctuator.RCURLYBRACE).getTokenLine();

    return lastLine - firstLine + 1;
  }
}
