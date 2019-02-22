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
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "S3317")
public class FileNameDiffersFromClassCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Rename this file to \"%s\".";
  private static final EnumSet<Symbol.Kind> CONSIDERED_KINDS = EnumSet.of(Symbol.Kind.CLASS, Symbol.Kind.CONST_VARIABLE, Symbol.Kind.FUNCTION);

  private boolean isOnlyExport = true;
  private String nameOfExported = null;

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(
      Kind.DEFAULT_EXPORT_DECLARATION,
      Kind.NAMESPACE_EXPORT_DECLARATION,
      Kind.NAMED_EXPORT_DECLARATION
    );
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.DEFAULT_EXPORT_DECLARATION)) {
      Tree exported = ((DefaultExportDeclarationTree) tree).object();

      if (exported.is(Kind.IDENTIFIER_REFERENCE)) {
        Optional<Symbol> symbol = ((IdentifierTree) exported).symbol();

        if (symbol.isPresent() && CONSIDERED_KINDS.contains(symbol.get().kind())) {
          nameOfExported = symbol.get().name();
        }

      } else if (exported.is(Kind.CLASS_DECLARATION)) {
        nameOfExported = ((ClassTree) exported).name().name();

      } else if (exported.is(Kind.FUNCTION_DECLARATION)) {
        nameOfExported = ((FunctionDeclarationTree) exported).name().name();
      }

    } else {
      isOnlyExport = false;
    }
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    if (isOnlyExport && nameOfExported != null) {

      String fileName = getContext().getJavaScriptFile().fileName().split("\\.")[0];
      if (!"index".equals(fileName) && !sameName(nameOfExported, fileName)) {
        addIssue(new FileIssue(this, String.format(MESSAGE, nameOfExported)));
      }
    }

    isOnlyExport = true;
    nameOfExported = null;
  }

  private static boolean sameName(String nameOfExported, String fileName) {
    String normalizedFileName = fileName
      .replace("_", "")
      .replace("-", "");
    return nameOfExported.equalsIgnoreCase(normalizedFileName);
  }
}
