/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import com.google.common.collect.Iterables;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S1128")
public class UnusedImportCheck extends DoubleDispatchVisitorCheck {

  private Set<Symbol> importedSymbols = new HashSet<>();

  @Override
  public void visitModule(ModuleTree tree) {
    importedSymbols.clear();
    super.visitModule(tree);
    importedSymbols.forEach(s -> {
      List<Usage> declarations = s.usages().stream().filter(Usage::isDeclaration).collect(Collectors.toList());
      if (s.usages().size() == 1 && declarations.size() == 1) {
        IdentifierTree identifierTree = Iterables.getOnlyElement(declarations).identifierTree();
        addIssue(identifierTree, String.format("Remove this unused import of '%s'.", identifierTree.name()));
      }
      if (declarations.size() > 1) {
        declarations.stream().skip(1).forEach(u -> addIssue(u.identifierTree(),
          String.format("'%s' is already imported; remove this redundant import.", u.identifierTree().name())));
      }
    });
  }

  @Override
  public void visitImportClause(ImportClauseTree tree) {
    tree.descendants()
      .filter(t -> t.is(Tree.Kind.BINDING_IDENTIFIER))
      .map(t -> (IdentifierTree) t)
      .forEach(identifierTree -> identifierTree.symbol().ifPresent(importedSymbols::add));
    super.visitImportClause(tree);
  }

  @Override
  public void visitImportDeclaration(ImportDeclarationTree tree) {
    if (isReactImport(tree)) {
      return;
    }
    super.visitImportDeclaration(tree);
  }

  private static boolean isReactImport(ImportDeclarationTree tree) {
    FromClauseTree fromClause = tree.fromClause();
    if (fromClause != null) {
      String module = fromClause.module().value();
      return "react".equals(module.substring(1, module.length() - 1));
    }
    return false;
  }
}
