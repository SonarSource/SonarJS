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

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S5693")
public class ContentLengthCheck extends Check {

  private static final int DEFAULT_FILE_UPLOAD_SIZE_LIMIT = 8_000_000;

  @RuleProperty(
    key = "fileUploadSizeLimit",
    description = "The maximum size of HTTP requests handling file uploads (in bytes)",
    defaultValue = "" + DEFAULT_FILE_UPLOAD_SIZE_LIMIT
  )
  long fileUploadSizeLimit = DEFAULT_FILE_UPLOAD_SIZE_LIMIT;

  private static final int DEFAULT_STANDARD_SIZE_LIMIT = 2_000_000;

  @RuleProperty(
    key = "standardSizeLimit",
    description = "The maximum size of regular HTTP requests (in bytes)",
    defaultValue = "" + DEFAULT_STANDARD_SIZE_LIMIT
  )
  long standardSizeLimit = DEFAULT_STANDARD_SIZE_LIMIT;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(
      new Config(fileUploadSizeLimit, standardSizeLimit)
    );
  }



  private static class Config {

    long fileUploadSizeLimit;

    long standardSizeLimit;

    Config(long fileUploadSizeLimit, long standardSizeLimit) {
      this.fileUploadSizeLimit = fileUploadSizeLimit;
      this.standardSizeLimit = standardSizeLimit;
    }
  }
}
