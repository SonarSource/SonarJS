/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S5604")
public class IntrusivePermissionsCheck implements EslintBasedCheck {

  private static final String DEFAULT = "geolocation";

  @RuleProperty(
    key = "permissions",
    description = "Comma-separated list of intrusive permissions to report " +
    "(supported values: geolocation, camera, microphone, notifications, persistent-storage)",
    defaultValue = "" + DEFAULT
  )
  public String permissions = DEFAULT;

  @Override
  public List<Object> configurations() {
    return Arrays.asList((Object[]) permissions.split("\\s*,\\s*"));
  }

  @Override
  public String eslintKey() {
    return "no-intrusive-permissions";
  }
}
