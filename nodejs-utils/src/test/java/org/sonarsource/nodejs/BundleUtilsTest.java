/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonarsource.nodejs;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.commons.compress.utils.IOUtils;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import static org.assertj.core.api.Assertions.assertThat;

public class BundleUtilsTest {

  @Rule
  public TemporaryFolder temporaryFolder = new TemporaryFolder();

  @Test
  public void test() throws Exception {
    Path tmp = temporaryFolder.newFolder().toPath();
    BundleUtils.extractFromClasspath(getClass().getResourceAsStream("/test.tar.xz"), tmp);
    File testFile = tmp.resolve("resources/bundle.txt").toFile();
    assertThat(testFile.exists()).isTrue();
    byte[] actual = Files.readAllBytes(testFile.toPath());
    byte[] expected = IOUtils.toByteArray(getClass().getResourceAsStream("/bundle.txt"));
    assertThat(actual).isEqualTo(expected);
  }

}
