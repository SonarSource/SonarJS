/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.metrics.FunctionDefiningModuleVisitor;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "S138")
public class TooManyLinesInFunctionCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "This function has %s lines, which is greater than the %s lines authorized. Split it into smaller functions.";

  private static final int DEFAULT = 200;

  @RuleProperty(
    key = "max",
    description = "Maximum authorized lines in a function",
    defaultValue = "" + DEFAULT)
  public int max = DEFAULT;

  private Set<FunctionTree> functionsDefiningModuleCurrentScript = new HashSet<>();

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Kind>builder()
      .addAll(KindSet.FUNCTION_KINDS.getSubKinds())
      .add(Kind.SCRIPT)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)) {
      functionsDefiningModuleCurrentScript = FunctionDefiningModuleVisitor.getFunctionsDefiningModule((ScriptTree) tree);

    } else if (!functionsDefiningModuleCurrentScript.contains(tree)){
      checkFunction((FunctionTree) tree);
    }
  }


  private void checkFunction(FunctionTree functionTree) {
    JavaScriptTree body = (JavaScriptTree) functionTree.body();
    int firstLine = body.firstToken().line();
    int lastLine = body.lastToken().endLine();

    int nbLines = lastLine - firstLine + 1;
    if (nbLines > max) {
      String message = String.format(MESSAGE, nbLines, max);
      IssueLocation primaryLocation = new IssueLocation(functionTree.firstToken(), functionTree.parameterClause(), message);
      addIssue(new PreciseIssue(this, primaryLocation));
    }
  }
}
