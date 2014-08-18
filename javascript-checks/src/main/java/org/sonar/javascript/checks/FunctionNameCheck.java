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
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.regex.Pattern;

@Rule(
  key = "S100",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class FunctionNameCheck extends SquidCheck<LexerlessGrammar> {

  public static final String DEFAULT = "^[a-z][a-zA-Z0-9]*$";
  private Pattern pattern = null;

  @RuleProperty(
    key = "format",
    defaultValue = "" + DEFAULT)
  public String format = DEFAULT;

  @Override
  public void init() {
    pattern = Pattern.compile(format);
    subscribeTo(
      EcmaScriptGrammar.FUNCTION_DECLARATION,
      EcmaScriptGrammar.GENERATOR_DECLARATION,
      EcmaScriptGrammar.GENERATOR_METHOD,
      EcmaScriptGrammar.METHOD);
  }

  @Override
  public void visitNode(AstNode astNode) {
    String identifier = astNode.getFirstChild(
      EcmaScriptTokenType.IDENTIFIER,
      EcmaScriptGrammar.PROPERTY_NAME,
      EcmaScriptGrammar.BINDING_IDENTIFIER).getTokenValue();


    if (!pattern.matcher(identifier).matches()) {
      getContext().createLineViolation(this, "Rename this ''{0}'' function to match the regular expression {1}", astNode,
        identifier,
        format);
    }
  }
}
