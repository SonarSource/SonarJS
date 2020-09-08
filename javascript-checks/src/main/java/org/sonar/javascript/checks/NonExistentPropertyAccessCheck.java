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

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import java.util.Optional;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.points.MemberProgramPoint;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

@JavaScriptRule
@Rule(key = "S3759")
public class NonExistentPropertyAccessCheck extends AbstractAnyPathSeCheck {

  private static final String MESSAGE = "Remove this access to \"%s\" property, it doesn't exist, as a built-in, on %s.";

  private static final Map<Type, String> TYPE_NAMES = ImmutableMap.<Type, String>builder()
    .put(Type.NUMBER_PRIMITIVE, "Number")
    .put(Type.NUMBER_OBJECT, "Number")
    .put(Type.STRING_PRIMITIVE, "String")
    .put(Type.STRING_OBJECT, "String")
    .put(Type.BOOLEAN_PRIMITIVE, "Boolean")
    .put(Type.BOOLEAN_OBJECT, "Boolean")
    .build();

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (isUndefinedProperty(currentState, element, programPoint)) {
      IdentifierTree propertyTree = ((DotMemberExpressionTree) element).property();
      addUniqueIssue(element, String.format(MESSAGE, propertyTree.name(), getTypeOfObject(currentState)));
    }
  }

  private static String getTypeOfObject(ProgramState programState) {
    Constraint constraintOnObject = programState.getConstraint(programState.peekStack());
    Type type = Type.find(constraintOnObject);
    return TYPE_NAMES.containsKey(type) ? ("a " + TYPE_NAMES.get(type)) : "this object";
  }

  private static boolean isUndefinedProperty(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (element.is(Kind.DOT_MEMBER_EXPRESSION)) {
      Optional<ProgramState> programState = ((MemberProgramPoint) programPoint).executeStrictMode(currentState);
      return programState.isPresent() && SpecialSymbolicValue.UNDEFINED.equals(programState.get().peekStack());
    }

    return false;
  }
}
