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
package org.sonar.plugins.javascript;

import static org.junit.Assert.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.commons.configuration.Configuration;
import org.junit.Test;
import org.sonar.plugins.javascript.core.JavaScript;

public class JavaScriptTest {

  @Test
  public void testGetFileSuffixes() {
    Configuration configuration = mock(Configuration.class);
    JavaScript javaScript = new JavaScript(configuration);
    javaScript.setConfiguration(configuration);

    when(configuration.getStringArray(JavaScriptPlugin.FILE_SUFFIXES_KEY)).thenReturn(null);

    assertArrayEquals(javaScript.getFileSuffixes(), new String[] { "js" });
    assertSame(configuration, javaScript.getConfiguration());
  }
}
