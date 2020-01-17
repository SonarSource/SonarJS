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

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ListMultimap;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S3863")
public class SameModuleImportsCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Merge this import with another one from the same module on line %s.";

  private ListMultimap<String, ImportDeclarationTree> simpleImportsByModule;
  private ListMultimap<String, ImportDeclarationTree> typeOfImportsByModule;
  private ListMultimap<String, ImportDeclarationTree> typeImportsByModule;

  @Override
  public void visitScript(ScriptTree tree) {
    simpleImportsByModule = ArrayListMultimap.create();
    typeOfImportsByModule = ArrayListMultimap.create();
    typeImportsByModule = ArrayListMultimap.create();

    super.visitScript(tree);

    checkImports(simpleImportsByModule);
    checkImports(typeOfImportsByModule);
    checkImports(typeImportsByModule);
  }

  private void checkImports(ListMultimap<String, ImportDeclarationTree> importsByModule) {
    for (String moduleName : importsByModule.keySet()) {
      List<ImportDeclarationTree> imports = importsByModule.get(moduleName);

      if (imports.size() > 1) {
        ImportDeclarationTree lastImport = imports.get(imports.size() - 1);
        ImportDeclarationTree firstImport = imports.get(0);

        PreciseIssue preciseIssue = addIssue(lastImport, String.format(MESSAGE, firstImport.firstToken().line()));
        for (int i = 0; i < imports.size() - 1; i++) {
          preciseIssue.secondary(imports.get(i));
        }
      }
    }
  }

  @Override
  public void visitImportDeclaration(ImportDeclarationTree tree) {
    SyntaxToken flowTypeToken = tree.flowImportTypeOrTypeOfToken();

    if (flowTypeToken == null) {
      addImportModule(tree, simpleImportsByModule);

    } else if (flowTypeToken.text().equals("type")) {
      addImportModule(tree, typeImportsByModule);

    } else {
      addImportModule(tree, typeOfImportsByModule);

    }
  }

  private static void addImportModule(ImportDeclarationTree tree, ListMultimap<String, ImportDeclarationTree> importsByModule) {
    String literal = tree.fromClause().module().value();
    String moduleName = literal.substring(1, literal.length() - 1);
    importsByModule.put(moduleName, tree);
  }
}
