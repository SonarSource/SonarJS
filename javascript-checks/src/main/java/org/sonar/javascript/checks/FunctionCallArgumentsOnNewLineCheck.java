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

import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.List;

@Rule(
  key = "S1472",
  priority = Priority.CRITICAL)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class FunctionCallArgumentsOnNewLineCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(EcmaScriptGrammar.CALL_EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    for (AstNode args : getCallArguments(astNode)) {
      int memberCallingLine = args.getPreviousSibling().getLastToken().getLine();

      if (args.getTokenLine() != memberCallingLine) {
        getContext().createLineViolation(this, "Make those call arguments start on line {0}", args, memberCallingLine);
      }
    }
  }

  private List<AstNode> getCallArguments(AstNode callExpr) {
    List<AstNode> callArguments = Lists.newArrayList();
    AstNode simpleCallExpr = callExpr.getFirstChild(EcmaScriptGrammar.SIMPLE_CALL_EXPRESSION);

    if (simpleCallExpr != null) {
      callArguments.add(simpleCallExpr.getFirstChild(EcmaScriptGrammar.ARGUMENTS));
    }
    callArguments.addAll(callExpr.getChildren(EcmaScriptGrammar.ARGUMENTS));

    return callArguments;
  }

}
