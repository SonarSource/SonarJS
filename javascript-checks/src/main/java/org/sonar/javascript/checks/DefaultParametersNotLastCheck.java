/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "S1788")
public class DefaultParametersNotLastCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Move parameter%s \"%s\" after parameters without default value.";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.copyOf(KindSet.FUNCTION_KINDS.getSubKinds());
  }

  @Override
  public void visitNode(Tree tree) {
    List<BindingElementTree> parameterList = ((FunctionTree) tree).parameterList();

    if (!parameterList.isEmpty() && parameterList.get(parameterList.size() - 1).is(Kind.REST_ELEMENT)) {
      return;
    }

    List<InitializedBindingElementTree> parametersWithDefault = new ArrayList<>();
    boolean raiseIssue = false;

    for (Tree parameter : parameterList) {
      if (parameter.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        parametersWithDefault.add((InitializedBindingElementTree) parameter);
      } else if (!parametersWithDefault.isEmpty()) {
        raiseIssue = true;
      }
    }

    if (raiseIssue) {
      raiseIssue(parametersWithDefault);
    }
  }

  private void raiseIssue(List<InitializedBindingElementTree> parametersWithDefault) {
    StringBuilder sb = new StringBuilder();

    for (InitializedBindingElementTree parameter : parametersWithDefault) {
      sb.append(CheckUtils.asString(parameter.left()));
      sb.append("\", \"");
    }

    String parameters = sb.toString();
    parameters = parameters.substring(0, parameters.length() - 4);

    String plural = parametersWithDefault.size() == 1 ? "" : "s";

    PreciseIssue preciseIssue = addIssue(parametersWithDefault.get(0).left(), String.format(MESSAGE, plural, parameters));

    for (int i = 1; i < parametersWithDefault.size(); i++) {
      preciseIssue.secondary(parametersWithDefault.get(i).left());
    }
  }

}
