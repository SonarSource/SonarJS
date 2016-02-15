/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import com.google.common.collect.ImmutableList;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import javax.annotation.CheckForNull;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S2234",
  name = "Parameters should be passed in the correct order",
  priority = Priority.BLOCKER,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5min")
public class MisorderedParameterListCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE_FORMAT = "Arguments to %s have the same names but not the same order as the function parameters.";

  @Override
  public void visitCallExpression(CallExpressionTree callExpression) {
    List<String> argumentNames = names(callExpression.arguments().parameters());
    if (argumentNames != null) {
      FunctionTree functionDeclaration = functionDeclaration(callExpression);
      if (functionDeclaration != null) {
        List<String> parameterNames = names(parameters(functionDeclaration));
        if (parameterNames != null && haveSameNamesAndDifferentOrders(argumentNames, parameterNames)) {
          newIssue(callExpression.arguments(), message(functionDeclaration))
            .secondary(functionDeclaration.parameterClause());
        }
      }
    }
    super.visitCallExpression(callExpression);
  }

  private static List<Tree> parameters(FunctionTree functionTree) {
    if (functionTree.parameterClause().is(Tree.Kind.FORMAL_PARAMETER_LIST)) {
      return ((ParameterListTree) functionTree.parameterClause()).parameters();

    } else {
      return ImmutableList.of(functionTree.parameterClause());
    }
  }

  @CheckForNull
  private static FunctionTree functionDeclaration(CallExpressionTree tree) {
    TypeSet types = tree.callee().types();
    FunctionType functionType = (FunctionType) types.getUniqueType(Type.Kind.FUNCTION);
    return functionType == null ? null : functionType.functionTree();
  }

  private static boolean haveSameNamesAndDifferentOrders(List<String> argumentNames, List<String> parameterNames) {
    return new HashSet<>(argumentNames).equals(new HashSet<>(parameterNames)) && !argumentNames.equals(parameterNames);
  }

  @CheckForNull
  private static List<String> names(List<Tree> list) {
    List<String> names = new ArrayList<>();
    for (Tree param : list) {
      Tree paramId = param;
      if (param.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        InitializedBindingElementTree initialized = (InitializedBindingElementTree) param;
        paramId = initialized.left();
      }
      if (!paramId.is(Kind.IDENTIFIER_REFERENCE, Kind.BINDING_IDENTIFIER)) {
        return null;
      }
      names.add(((IdentifierTree) paramId).name().toLowerCase());
    }
    return names;
  }

  private static String message(FunctionTree functionDeclaration) {
    String parameter = "this call";
    if (functionDeclaration.is(Kind.FUNCTION_DECLARATION)) {
      parameter = "\"" + ((FunctionDeclarationTree) functionDeclaration).name().name() + "\"";
    }
    return String.format(MESSAGE_FORMAT, parameter);
  }

}
