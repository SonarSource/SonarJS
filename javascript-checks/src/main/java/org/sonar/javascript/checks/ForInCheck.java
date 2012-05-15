/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
import org.sonar.javascript.api.EcmaScriptGrammar;

import java.util.Collections;
import java.util.List;

@Rule(
  key = "ForIn",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class ForInCheck extends SquidCheck<EcmaScriptGrammar> {

  @Override
  public void init() {
    subscribeTo(getContext().getGrammar().forInStatement);
  }

  @Override
  public void visitNode(AstNode astNode) {
    EcmaScriptGrammar g = getContext().getGrammar();
    AstNode statementNode = astNode.findFirstDirectChild(g.statement);

    final List<AstNode> statements;
    if (statementNode.getChild(0).is(g.block)) {
      AstNode statementListNode = statementNode.getChild(0).findFirstDirectChild(g.statementList);
      if (statementListNode == null) {
        statements = Collections.emptyList();
      } else {
        statements = statementListNode.findDirectChildren(g.statement);
      }
    } else {
      statements = Collections.singletonList(statementNode);
    }

    for (AstNode statement : statements) {
      if (statement.getChild(0).isNot(getContext().getGrammar().ifStatement)) {
        getContext().createLineViolation(this, "For-in statement must filter items.", statement);
        break;
      }
    }
  }

}
