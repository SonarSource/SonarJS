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
package org.sonar.css;

import org.sonar.api.config.Configuration;
import org.sonar.api.resources.AbstractLanguage;

public class CssLanguage extends AbstractLanguage {

  public static final String KEY = "css";
  public static final String FILE_SUFFIXES_KEY = "sonar.css.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = ".css,.less,.scss,.sass";

  private Configuration configuration;

  public CssLanguage(Configuration configuration) {
    super(KEY, "CSS");
    this.configuration = configuration;
  }

  @Override
  public String[] getFileSuffixes() {
    return configuration.getStringArray(FILE_SUFFIXES_KEY);
  }
}
