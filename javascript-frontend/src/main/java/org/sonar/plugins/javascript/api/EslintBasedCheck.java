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
package org.sonar.plugins.javascript.api;

import java.util.Collections;
import java.util.List;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

public interface EslintBasedCheck extends JavaScriptCheck {

  String eslintKey();

  default List<Object> configurations() {
    return Collections.emptyList();
  }

  @Override
  default List<Issue> scanFile(TreeVisitorContext context) {
    return Collections.emptyList();
  }

  @Override
  default LineIssue addLineIssue(Tree tree, String message) {
    throw new IllegalStateException("No issue should be created for EslintBasedCheck");
  }

  @Override
  default PreciseIssue addIssue(Tree tree, String message) {
    throw new IllegalStateException("No issue should be created for EslintBasedCheck");
  }

  @Override
  default  <T extends Issue> T addIssue(T issue) {
    throw new IllegalStateException("No issue should be created for EslintBasedCheck");
  }

}
