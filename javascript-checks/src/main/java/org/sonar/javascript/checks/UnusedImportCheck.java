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

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Iterables;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S1128")
public class UnusedImportCheck extends DoubleDispatchVisitorCheck {

  private static final Set<String> EXCLUDED_IMPORTS = ImmutableSet.of("React");

  @Override
  public void visitModule(ModuleTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();
    symbolModel.getSymbols(Symbol.Kind.IMPORT).forEach(this::checkImport);
    super.visitModule(tree);
  }

  private void checkImport(Symbol s) {
    if (EXCLUDED_IMPORTS.contains(s.name())) {
      return;
    }
    List<Usage> declarations = s.usages().stream().filter(Usage::isDeclaration).collect(Collectors.toList());
    if (s.usages().size() == 1 && declarations.size() == 1) {
      IdentifierTree identifierTree = Iterables.getOnlyElement(declarations).identifierTree();
      addIssue(identifierTree, String.format("Remove this unused import of '%s'.", identifierTree.name()));
    }
    if (declarations.size() > 1) {
      declarations.stream().skip(1).forEach(u -> addIssue(u.identifierTree(),
        String.format("'%s' is already imported; remove this redundant import.", u.identifierTree().name())));
    }
  }
}
