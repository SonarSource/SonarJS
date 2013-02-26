/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript.core;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.config.Settings;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertSame;

public class JavaScriptTest {

  private Settings settings;
  private JavaScript javaScript;

  @Before
  public void setUp() {
    settings = new Settings();
    javaScript = new JavaScript(settings);
  }

  @Test
  public void defaultSuffixes() {
    settings.setProperty(JavaScriptPlugin.FILE_SUFFIXES_KEY, "");
    assertArrayEquals(javaScript.getFileSuffixes(), new String[] {"js"});
    assertSame(settings, javaScript.getSettings());
  }

  @Test
  public void customSuffixes() {
    settings.setProperty(JavaScriptPlugin.FILE_SUFFIXES_KEY, "javascript");
    assertArrayEquals(javaScript.getFileSuffixes(), new String[] {"javascript"});
  }

}
