/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.base.Preconditions;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;

/**
 * Legacy kind of issue (issue assigned to a line, no secondary locations).
 * This class should be marked as deprecated as soon as the plugin will be migrated on 5.X LTS
 */
public class LineIssue implements Issue {

  private JavaScriptCheck check;
  private Double cost;
  private String message;
  private int line;

  public LineIssue(JavaScriptCheck check, int line, String message) {
    Preconditions.checkArgument(line > 0);
    this.check = check;
    this.message = message;
    this.line = line;
    this.cost = null;
  }

  public LineIssue(JavaScriptCheck check, Tree tree, String message) {
    this.check = check;
    this.message = message;
    this.line = tree.firstToken().line();
    this.cost = null;
  }

  public String message() {
    return message;
  }

  public int line() {
    return line;
  }

  @Override
  public JavaScriptCheck check() {
    return check;
  }

  @Nullable
  @Override
  public Double cost() {
    return cost;
  }

  @Override
  public Issue cost(double cost) {
    this.cost = cost;
    return this;
  }
}
