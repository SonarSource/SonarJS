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
package org.sonar.javascript.tree.impl.declaration;

import java.util.stream.Stream;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public abstract class FunctionTreeImpl extends JavaScriptTree implements FunctionTree {

  private Scope scope;

  @Override
  public final Scope scope() {
    return scope;
  }

  public final void scope(Scope scope) {
    this.scope = scope;
  }

  public Stream<Usage> outerScopeSymbolUsages() {
    return SymbolUsagesVisitor.outerScopeSymbolUsages(this);
  }

  private static class SymbolUsagesVisitor extends DoubleDispatchVisitor {

    private FunctionTree functionTree;
    private Stream.Builder<Usage> outerScopeUsages = Stream.builder();

    private SymbolUsagesVisitor(FunctionTree functionTree) {
      this.functionTree = functionTree;
    }

    private static Stream<Usage> outerScopeSymbolUsages(FunctionTree functionTree) {
      SymbolUsagesVisitor symbolUsagesVisitor = new SymbolUsagesVisitor(functionTree);
      symbolUsagesVisitor.scan(functionTree.body());
      symbolUsagesVisitor.scan(functionTree.parameterClause());
      return symbolUsagesVisitor.outerScopeUsages.build();
    }

    @Override
    public void visitIdentifier(IdentifierTree tree) {
      tree.symbolUsage().ifPresent(usage -> {
        Tree symbolScopeTree = usage.symbol().scope().tree();
        if (symbolScopeTree.isAncestorOf(functionTree)) {
          outerScopeUsages.add(usage);
        }
      });
    }
  }
}
