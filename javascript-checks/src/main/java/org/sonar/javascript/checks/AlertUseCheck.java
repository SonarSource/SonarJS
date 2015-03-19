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
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.NoSqale;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S1442",
  name = "\"alert(...)\" should not be used",
  priority = Priority.MAJOR,
  tags = {Tags.CWE, Tags.SECURITY, Tags.USER_EXPERIENCE})
@ActivatedByDefault
@NoSqale
public class AlertUseCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Kind.CALL_EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    ExpressionTree callee = ((CallExpressionTree)astNode).callee();

    if (callee.is(Kind.IDENTIFIER_REFERENCE) && isAlertCall((IdentifierTree) callee)) {
      getContext().createLineViolation(this, "Remove this usage of alert(...).", astNode);
    }
  }

  public static boolean isAlertCall(IdentifierTree identifier) {
    return "alert".equals(identifier.name());
  }
}
