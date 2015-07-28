/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.plugins.javascript.cpd;

import org.junit.Test;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.plugins.javascript.core.JavaScript;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class JavaScriptCpdMappingTest {

  @Test
  public void test() {
    JavaScript language = mock(JavaScript.class);
    FileSystem fs = mock(FileSystem.class);
    JavaScriptCpdMapping mapping = new JavaScriptCpdMapping(language, fs);
    assertThat(mapping.getLanguage()).isSameAs(language);
    assertThat(mapping.getTokenizer()).isInstanceOf(JavaScriptTokenizer.class);
  }

}
