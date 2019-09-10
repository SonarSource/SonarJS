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

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.annotations.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S104")
public class TooManyLinesInFileCheck extends EslintBasedCheck {

  private static final int DEFAULT = 1000;

  @RuleProperty(
    key = "maximum",
    description = "Maximum authorized lines in a file.",
    defaultValue = "" + DEFAULT)
  public int maximum = DEFAULT;

  @Override
  public List<Object> configurations() {
    Map<String, Object> configurationsMap = new HashMap<>();
    configurationsMap.put("max", maximum);
    configurationsMap.put("skipBlankLines", true);
    configurationsMap.put("skipComments", true);
    return Collections.singletonList(configurationsMap);
  }

  @Override
  public String eslintKey() {
    return "max-lines";
  }

}

