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

import com.google.common.collect.Sets;
import com.google.common.collect.Sets.SetView;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S2376")
public class GetterSetterCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Provide a %s matching this %s for '%s'.";

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    checkProperties(tree.properties());

    super.visitObjectLiteral(tree);
  }

  @Override
  public void visitClass(ClassTree tree) {
    checkProperties(tree.elements());

    super.visitClass(tree);
  }

  private void checkProperties(List<Tree> properties) {
    Map<String, AccessorMethodDeclarationTree> getters = accessors(Kind.GET_METHOD, properties);
    Map<String, AccessorMethodDeclarationTree> setters = accessors(Kind.SET_METHOD, properties);

    Set<String> getterNames = getters.keySet();
    Set<String> setterNames = setters.keySet();
    SetView<String> onlyGetters = Sets.difference(getterNames, setterNames);
    SetView<String> onlySetters = Sets.difference(setterNames, getterNames);

    for (String getterName : onlyGetters) {
      raiseIssue(getters.get(getterName), String.format(MESSAGE, "setter", "getter", getterName));
    }
    for (String setterName : onlySetters) {
      raiseIssue(setters.get(setterName), String.format(MESSAGE, "getter", "setter", setterName));
    }
  }

  private void raiseIssue(AccessorMethodDeclarationTree tree, String message) {
    addIssue(new PreciseIssue(this, new IssueLocation(tree, tree.name(), message)));
  }

  private static Map<String, AccessorMethodDeclarationTree> accessors(Kind kind, List<Tree> properties) {
    return properties.stream()
      .filter(property -> property.is(kind))
      .collect(Collectors.toMap(
        property -> getName((AccessorMethodDeclarationTree) property),
        tree -> (AccessorMethodDeclarationTree) tree,
        // for duplication
        (property1, property2) -> property1));
  }

  private static String getName(AccessorMethodDeclarationTree tree) {
    return CheckUtils.asString(tree.name());
  }
}
