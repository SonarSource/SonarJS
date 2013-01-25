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

@Rule(
  key = "UnreachableCode",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class UnreachableCodeCheck extends SquidCheck<EcmaScriptGrammar> {

  @Override
  public void init() {
    subscribeTo(
        getContext().getGrammar().breakStatement,
        getContext().getGrammar().returnStatement,
        getContext().getGrammar().continueStatement,
        getContext().getGrammar().throwStatement);
  }

  @Override
  public void visitNode(AstNode node) {
    while (node.getParent().is(getContext().getGrammar().statement)
        || node.getParent().is(getContext().getGrammar().sourceElement)) {
      node = node.getParent();
    }

    if (node.getNextSibling() != null) {
      AstNode v = node.getNextSibling();
      if (!v.is(getContext().getGrammar().elseClause)) {
        getContext().createLineViolation(this, "This statement can't be reached and so start a dead code block.", v);
      }
    }
  }

}
