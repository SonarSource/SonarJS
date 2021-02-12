/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2021 SonarSource SA
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
package org.sonar.samples.javascript;


import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.samples.javascript.checks.BaseTreeVisitorCheck;
import org.sonar.samples.javascript.checks.SubscriptionBaseVisitorCheck;

// we want to keep this test until we are able to remove CustomJavaScriptRulesDefinition completely
public class DeprecatedCustomRulesDefinition extends CustomJavaScriptRulesDefinition {

  @Override
  public String repositoryName() {
    return "Custom Repository";
  }

  @Override
  public String repositoryKey() {
    return "deprecated-custom-rules";
  }

  @Override
  public Class[] checkClasses() {
    return new Class[]{
      BaseTreeVisitorCheck.class,
      SubscriptionBaseVisitorCheck.class
    };
  }
}
