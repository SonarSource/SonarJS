/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import java.util.List;
import java.util.Set;
import java.util.function.IntFunction;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

@Rule(key = "S930")
public class TooManyArgumentsCheck extends AbstractAnyPathSeCheck {

  private static final String MESSAGE = "%s%s expects %s argument%s, but %s %s provided.";

  private static final Set<String> BUILT_IN_FUNCTIONS_TO_IGNORE = Sets.newHashSet("toString", "toLocaleString");

  @Override
  public void endOfFile(ScriptTree scriptTree) {
    TreeVisitorCheck visitor = new TreeVisitorCheck();
    visitor.visitScript(scriptTree);
  }

  /**
   * Gets the issues for built-in functions.
   */
  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (element.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpression = (CallExpressionTree) element;
      SeparatedList<ExpressionTree> actualArguments = callExpression.argumentClause().arguments();
      int nbActualArguments = actualArguments.size();

      SymbolicValue calleeValue = currentState.peekStack(nbActualArguments);
      if (nbActualArguments > 0 
        && calleeValue instanceof BuiltInFunctionSymbolicValue 
        && shouldCheck(callExpression)) {

        BuiltInFunctionSymbolicValue builtInFunction = (BuiltInFunctionSymbolicValue) calleeValue;

        if (builtInFunction.signature() != null && hasTooManyArguments(builtInFunction.signature(), nbActualArguments)) {
          int nbExpectedArguments = getNbParameters(builtInFunction.signature());
          String message = getMessage(callExpression, nbExpectedArguments, nbActualArguments, null);
          addUniqueIssue(callExpression.argumentClause(), message);
        }
      }
    }
  }
  
  private static boolean hasTooManyArguments(IntFunction<Constraint> signature, int nbActualArguments) {
    return signature.apply(nbActualArguments - 1) == null;
  }

  /**
   * Returns the number of parameters of the specified built-in function.
   * @param signature a function parameter signature assumed to have a fixed number of parameters (that is, no rest parameters).
   */
  private static int getNbParameters(IntFunction<Constraint> signature) {
    int index = 0;
    while (true) {
      // for a non-existing parameter, method "apply" returns null
      if (signature.apply(index) == null) {
        break;
      }
      index++;
    }
    return index;
  }

  private static String getMessage(CallExpressionTree tree, int parametersNumber, int argumentsNumber, @Nullable Integer declarationLine) {
    ExpressionTree callee = getCallee(tree); 
    String calleeName;
    if (callee.is(Kind.FUNCTION_EXPRESSION)) {
      calleeName = "This function";
    } else if (callee.is(Kind.DOT_MEMBER_EXPRESSION)) {
      calleeName = "\"" + ((DotMemberExpressionTree)callee).property().name() + "\"";
    } else {
      calleeName = "\"" + CheckUtils.asString(callee) + "\"";
    }

    return String.format(
      MESSAGE,
      calleeName,
      declarationLine == null ? "" : (" declared at line " + declarationLine),
      parametersNumber,
      parametersNumber == 1 ? "" : "s",
      argumentsNumber,
      argumentsNumber > 1 ? "were" : "was"
    );
  }

  private static ExpressionTree getCallee(CallExpressionTree callExpression) {
    return CheckUtils.removeParenthesis(callExpression.callee()); 
  }

  private boolean shouldCheck(CallExpressionTree callExpression) {
    // the test below is an optimization
    if (alreadyHasIssueOn(callExpression)) {
      return false;
    } else {
      ExpressionTree callee = getCallee(callExpression);
      if (callee.is(Kind.DOT_MEMBER_EXPRESSION)) {
        String functionName = ((DotMemberExpressionTree)callee).property().name();
        return !BUILT_IN_FUNCTIONS_TO_IGNORE.contains(functionName);
      }
      return true;
    }
  }

  /**
   * This visitor is responsible for raising issues based on symbol model and syntax tree.
   * Thus TooManyArgumentsCheck based on symbolic execution is checking built-in function calls while this one checks user-defined functions.
   */
  private class TreeVisitorCheck extends DoubleDispatchVisitor {

    @Override
    public void visitCallExpression(CallExpressionTree tree) {
      FunctionTree functionTree = getFunction(tree);

      if (functionTree != null) {
        int parametersNumber = functionTree.parameterList().size();
        int argumentsNumber = tree.argumentClause().arguments().size();

        if (!hasRestParameter(functionTree) && !builtInArgumentsUsed(functionTree) && argumentsNumber > parametersNumber) {
          String message = getMessage(tree, parametersNumber, argumentsNumber, functionTree.parameterClause().firstToken().line());
          addUniqueIssue(tree.argumentClause(), message, new IssueLocation(functionTree.parameterClause(), "Formal parameters"));
        }
      }

      super.visitCallExpression(tree);
    }

    /*
    * @return true if function's last parameter has "... p" format and stands for all rest parameters
    */
    private boolean hasRestParameter(FunctionTree functionTree) {
      List<BindingElementTree> parameters = functionTree.parameterList();
      return !parameters.isEmpty() && (parameters.get(parameters.size() - 1).is(Tree.Kind.REST_ELEMENT));
    }

    @Nullable
    private FunctionTree getFunction(CallExpressionTree tree) {
      Set<Type> types = tree.callee().types();

      if (types.size() == 1 && types.iterator().next().kind().equals(Type.Kind.FUNCTION)) {
        return ((FunctionType) types.iterator().next()).functionTree();
      }

      return null;
    }

    private boolean builtInArgumentsUsed(FunctionTree tree) {
      Scope scope = TooManyArgumentsCheck.this.getContext().getSymbolModel().getScope(tree);
      if (scope == null) {
        throw new IllegalStateException("No scope found for FunctionTree");
      }

      Symbol argumentsBuiltInVariable = scope.lookupSymbol("arguments");
      if (argumentsBuiltInVariable == null) {
        if (!tree.is(Kind.ARROW_FUNCTION)) {
          throw new IllegalStateException("No 'arguments' symbol found for function scope");
        } else {
          return false;
        }
      }

      boolean isUsed = !argumentsBuiltInVariable.usages().isEmpty();
      return argumentsBuiltInVariable.external() && isUsed;
    }

  }

}
