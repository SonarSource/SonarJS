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

import com.google.common.collect.Sets;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.internal.declaration.ParameterListTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.Set;

@Rule(
  key = "DuplicateFunctionArgument",
  name = "Function argument names should be unique",
  priority = Priority.CRITICAL,
  tags = {Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class DuplicateFunctionArgumentCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Rename or remove duplicate function argument '%s'.";

  @Override
  public void visitParameterList(ParameterListTree tree) {
    if (tree.is(Tree.Kind.FORMAL_PARAMETER_LIST)){
      Set<String> values = Sets.newHashSet();

      for (IdentifierTree identifier : ((ParameterListTreeImpl) tree).parameterIdentifiers()) {
        checkIdentifier(identifier, identifier.name(), values);
      }
    }
    super.visitParameterList(tree);
  }

  private void checkIdentifier(IdentifierTree identifier, String value, Set<String> values) {
    String unescaped = EscapeUtils.unescape(value);

    if (values.contains(unescaped)) {
      getContext().addIssue(this, identifier, String.format(MESSAGE, value));
    } else {
      values.add(unescaped);
    }
  }

}
