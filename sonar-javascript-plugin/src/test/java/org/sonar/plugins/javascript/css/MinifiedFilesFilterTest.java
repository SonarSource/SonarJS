/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.css.plugin;

import org.junit.Test;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

import static org.assertj.core.api.Assertions.assertThat;

public class MinifiedFilesFilterTest {

  private static final MinifiedFilesFilter MINIFIED_FILES_FILTER = new MinifiedFilesFilter();

  @Test
  public void should_exclude_by_name() throws Exception {
    DefaultInputFile jsFile = TestInputFileBuilder.create("", "foo.min.css")
      .setLanguage("css")
      .setContents("short content")
      .build();
    assertThat(MINIFIED_FILES_FILTER.accept(jsFile)).isFalse();
  }

  @Test
  public void should_keep_other_lang() throws Exception {
    DefaultInputFile jsFile = TestInputFileBuilder.create("", "foo.min.css").setLanguage("js").build();
    assertThat(MINIFIED_FILES_FILTER.accept(jsFile)).isTrue();
  }

  @Test
  public void should_exclude_by_content() throws Exception {
    String longContent = new String(new char[500]).replace("\0", "a") + "\n";

    DefaultInputFile jsFile = TestInputFileBuilder.create("", "foo.css")
      .setLanguage("css")
      .setContents(longContent)
      .build();
    assertThat(MINIFIED_FILES_FILTER.accept(jsFile)).isFalse();
  }
}
