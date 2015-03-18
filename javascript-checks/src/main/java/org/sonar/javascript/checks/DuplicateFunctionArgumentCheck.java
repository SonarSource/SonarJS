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

import java.util.Set;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.collect.Sets;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "DuplicateFunctionArgument",
  name = "Function argument names should be unique",
  priority = Priority.CRITICAL,
  tags = {Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("30min")
public class DuplicateFunctionArgumentCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Tree.Kind.FORMAL_PARAMETER_LIST);
  }

  @Override
  public void visitNode(AstNode astNode) {
    Set<String> values = Sets.newHashSet();

    for (IdentifierTree identifier : ((ParameterListTreeImpl) astNode).parameterIdentifiers()) {
      checkIdentifier((AstNode) identifier, identifier.name(), values);
    }
  }

  private void checkIdentifier(AstNode identifier, String value, Set<String> values) {
    String unescaped = EscapeUtils.unescape(value);

    if (values.contains(unescaped)) {
      getContext().createLineViolation(this, "Rename or remove duplicate function argument '" + value + "'.", identifier);
    } else {
      values.add(unescaped);
    }
  }

}
