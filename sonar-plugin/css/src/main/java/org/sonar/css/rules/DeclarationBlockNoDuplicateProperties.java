/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.css.rules;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;

@Rule(key = "S4656")
public class DeclarationBlockNoDuplicateProperties implements CssRule {

  private static final boolean DEFAULT_IGNORE_FALLBACKS = true;

  @RuleProperty(
    key = "ignoreFallbacks",
    description = "Ignore consecutive duplicated properties with different values.",
    defaultValue = "" + DEFAULT_IGNORE_FALLBACKS
  )
  boolean ignoreFallbacks = DEFAULT_IGNORE_FALLBACKS;

  @Override
  public String stylelintKey() {
    return "declaration-block-no-duplicate-properties";
  }

  @Override
  public List<Object> stylelintOptions() {
    return ignoreFallbacks
      ? Arrays.asList(true, new StylelintIgnoreOption())
      : Collections.emptyList();
  }

  private static class StylelintIgnoreOption {

    private final List<String> ignore = Collections.singletonList(
      "consecutive-duplicates-with-different-values"
    );
  }
}
