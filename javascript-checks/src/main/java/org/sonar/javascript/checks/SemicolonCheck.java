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
import org.sonar.javascript.api.EcmaScriptPunctuator;

@Rule(
  key = "Semiciolon",
  priority = Priority.MAJOR,
  name = "Each statement must end with a semicolon",
  description = "Each statement must end with a semicolon.")
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class SemicolonCheck extends SquidCheck<EcmaScriptGrammar> {

  @Override
  public void init() {
    subscribeTo(getContext().getGrammar().eos, getContext().getGrammar().eosNoLb);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.findFirstChild(EcmaScriptPunctuator.SEMI) == null) {
      getContext().createLineViolation(this, "Missing semicolon.", astNode);
    }
  }

}
