/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.javascript.checks;

import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S139")
@DeprecatedRuleKey(ruleKey = "TrailingComment")
public class S139 extends Check {

  private static final String DEFAULT_LEGAL_COMMENT_PATTERN = "^\\s*[^\\s]+$";

  @RuleProperty(
    key = "pattern",
    description = "Pattern (JavaScript syntax) for text of trailing comments that are allowed.",
    defaultValue = DEFAULT_LEGAL_COMMENT_PATTERN
  )
  String legalCommentPattern = DEFAULT_LEGAL_COMMENT_PATTERN;



  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(legalCommentPattern));
  }

  private static class Config {

    String ignorePattern;

    Config(String ignorePattern) {
      this.ignorePattern = ignorePattern;
    }
  }
}
