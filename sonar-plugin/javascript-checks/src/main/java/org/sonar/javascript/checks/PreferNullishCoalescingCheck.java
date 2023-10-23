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

import com.google.gson.annotations.SerializedName;
import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@TypeScriptRule
@Rule(key = "S6606")
public class PreferNullishCoalescingCheck implements EslintBasedCheck {

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config());
  }

  @Override
  public String eslintKey() {
    return "prefer-nullish-coalescing";
  }

  private static class Config {

    boolean ignoreConditionalTests = true;
    boolean ignoreTernaryTests = false;
    boolean ignoreMixedLogicalExpressions = true;
    boolean allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing = true;

    IgnorePrimitives ignorePrimitives = new IgnorePrimitives();

    private static class IgnorePrimitives {

      boolean string = false;

      @SerializedName(value = "boolean")
      boolean bool = true;

      boolean number = false;
      boolean bigint = false;
    }
  }
}
