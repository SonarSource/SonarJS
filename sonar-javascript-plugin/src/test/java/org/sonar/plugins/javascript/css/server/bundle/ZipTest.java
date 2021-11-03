/*
 * SonarCSS
 * Copyright (C) 2018-2021 SonarSource SA
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
package org.sonar.css.plugin.server.bundle;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.utils.internal.JUnitTempFolder;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.assertj.core.api.Java6Assertions.assertThat;

public class ZipTest {

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  @Test
  public void test() throws Exception {
    Path zipFile = tempFolder.newFile().toPath();
    try (ZipOutputStream zout = new ZipOutputStream(Files.newOutputStream(zipFile))) {
      ZipEntry dir = new ZipEntry("dir/");
      zout.putNextEntry(dir);
      zout.closeEntry();
      ZipEntry zipEntry = new ZipEntry("dir/file.txt");
      zout.putNextEntry(zipEntry);
      zout.write("Hello World".getBytes());
      zout.closeEntry();
    }
    Path out = tempFolder.newDir().toPath();
    Zip.extract(Files.newInputStream(zipFile), out);
    assertThat(out.resolve("dir/file.txt").toFile()).hasContent("Hello World");
  }

  @Test
  public void test_empty_zip() throws Exception {
    Path zipFile = tempFolder.newFile().toPath();
    try (ZipOutputStream zout = new ZipOutputStream(Files.newOutputStream(zipFile))) {

    }
    Path out = tempFolder.newDir().toPath();
    assertThatThrownBy(() -> Zip.extract(Files.newInputStream(zipFile), out))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("At least one entry expected.");
  }

  @Test
  public void test_invalid_entry() throws Exception {
    Path zipFile = tempFolder.newFile().toPath();
    try (ZipOutputStream zout = new ZipOutputStream(Files.newOutputStream(zipFile))) {
      ZipEntry zipEntry = new ZipEntry("../file.txt");
      zout.putNextEntry(zipEntry);
      zout.write("Hello World".getBytes());
      zout.closeEntry();
    }
    Path out = tempFolder.newDir().toPath();
    assertThatThrownBy(() -> Zip.extract(Files.newInputStream(zipFile), out))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Archive entry ../file.txt is not within " + out);
  }

}
