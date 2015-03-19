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

import javax.annotation.Nullable;

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.LabelledStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.NoSqale;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S1219",
  name = "\"switch\" statements should not contain non-case labels",
  priority = Priority.CRITICAL,
  tags = {Tags.MISRA, Tags.PITFALL})
@ActivatedByDefault
@NoSqale
public class NonCaseLabelInSwitchCheck extends SquidCheck<LexerlessGrammar> {

  private boolean inCase;

  @Override
  public void init() {
    subscribeTo(
      Kind.CASE_CLAUSE,
      Kind.LABELLED_STATEMENT);
  }

  @Override
  public void visitFile(@Nullable AstNode astNode) {
    inCase = false;
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(Kind.CASE_CLAUSE)) {
      inCase = true;
    } else if (inCase && astNode.is(Kind.LABELLED_STATEMENT)) {
      getContext().createLineViolation(this, "Remove this misleading \"{0}\" label.",
        astNode, ((LabelledStatementTree) astNode).label().name());
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(Kind.CASE_CLAUSE)) {
      inCase = false;
    }
  }
}
