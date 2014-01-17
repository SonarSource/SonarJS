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
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.List;

@Rule(
  key = "S878",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class CommaOperatorUseCheck extends SquidCheck<LexerlessGrammar> {
  @Override
  public void init() {
    subscribeTo(
      EcmaScriptGrammar.EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (!containsCommaOperator(astNode) || isInitOrIncrementOfForLoop(astNode)) {
      return;
    }

    List<AstNode> commas = astNode.getChildren(EcmaScriptPunctuator.COMMA);

    if (commas.size() == 1) {
      getContext().createLineViolation(this, "Remove use of this comma operator.", commas.get(0));
    } else {
      getContext().createLineViolation(this, "Remove use of all comma operators in this expression.", commas.get(0));
    }
  }

  public static boolean isInitOrIncrementOfForLoop(AstNode expr) {
    return expr.getParent().is(EcmaScriptGrammar.FOR_STATEMENT);
  }

  public static boolean containsCommaOperator(AstNode expr) {
    return expr.hasDirectChildren(EcmaScriptPunctuator.COMMA);
  }

}
