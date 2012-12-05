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
import org.sonar.check.RuleProperty;
import org.sonar.javascript.api.EcmaScriptGrammar;

@Rule(
  key = "ExcessiveParameterList",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class ExcessiveParameterListCheck extends SquidCheck<EcmaScriptGrammar> {

  private static final int DEFAULT_MAXIMUM_FUNCTION_PARAMETERS = 7;

  @RuleProperty(
    key = "maximumFunctionParameters",
    defaultValue = "" + DEFAULT_MAXIMUM_FUNCTION_PARAMETERS)
  private int maximumFunctionParameters = DEFAULT_MAXIMUM_FUNCTION_PARAMETERS;

  @Override
  public void init() {
    subscribeTo(getContext().getGrammar().formalParameterList);
  }

  @Override
  public void visitNode(AstNode node) {
    int numberOfParameters = getNumberOfParameters(node);
    if (numberOfParameters > maximumFunctionParameters) {
      getContext().createLineViolation(this,
          "Function has {0,number,integer} parameters which is greater than {1,number,integer} authorized.",
          node,
          numberOfParameters,
          maximumFunctionParameters);
    }
  }

  private int getNumberOfParameters(AstNode node) {
    return (node.getNumberOfChildren() - 1) / 2 + 1;
  }

  public void setMaximumFunctionParameters(int threshold) {
    this.maximumFunctionParameters = threshold;
  }


}
