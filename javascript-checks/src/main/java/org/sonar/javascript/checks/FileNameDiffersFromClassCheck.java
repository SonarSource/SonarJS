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
import java.util.List;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3317",
  name = "Class names and file names should match",
  priority = Priority.MAJOR,
  tags = {Tags.ES2015, Tags.CONFUSING})
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class FileNameDiffersFromClassCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Rename this file to \"%s\".";

  private boolean isOnlyExport = true;
  private String className = null;

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
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
        IdentifierTree identifierTree = (IdentifierTree) exported;

        if (identifierTree.types().contains(Type.Kind.CLASS)) {
          className = identifierTree.name();
        }

      } else if (exported.is(Kind.CLASS_DECLARATION)) {
        className = ((ClassTree) exported).name().name();
      }

    } else {
      isOnlyExport = false;
    }
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    if (isOnlyExport && className != null) {
      String fileName = getContext().getFile().getName();

      if (!fileName.equals(className + ".js")) {
        addIssue(new FileIssue(this, String.format(MESSAGE, className)));
      }
    }

    isOnlyExport = true;
    className = null;
  }
}
