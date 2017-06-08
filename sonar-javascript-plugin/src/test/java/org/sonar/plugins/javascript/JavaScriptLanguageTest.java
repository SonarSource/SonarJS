/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.plugins.javascript;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.config.MapSettings;
import org.sonar.api.config.Settings;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptLanguageTest {

  private Settings settings;
  private JavaScriptLanguage javaScriptLanguage;

  @Before
  public void setUp() {
    settings = new MapSettings();
    javaScriptLanguage = new JavaScriptLanguage(settings);
  }

  @Test
  public void defaultSuffixes() {
    settings.setProperty(JavaScriptPlugin.FILE_SUFFIXES_KEY, "");
    assertThat(javaScriptLanguage.getFileSuffixes()).containsOnly(".js", ".jsx", ".vue");
  }

  @Test
  public void customSuffixes() {
    settings.setProperty(JavaScriptPlugin.FILE_SUFFIXES_KEY, "javascript");
    assertThat(javaScriptLanguage.getFileSuffixes()).containsOnly("javascript");
  }

}
