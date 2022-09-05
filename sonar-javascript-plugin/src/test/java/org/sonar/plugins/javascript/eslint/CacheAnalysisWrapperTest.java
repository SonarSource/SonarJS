/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.WriteCache;

import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CacheAnalysisWrapperTest {

  @TempDir
  Path projectDir;

  @Test
  void should_send_an_archive() throws IOException {
    var testFile = createFile("test.js");
    var ucfgFiles = Stream.of("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg")
      .map(this::createFile)
      .map(this::toAbsolutePath)
      .collect(toList());

    Files.write(testFile, List.of("console.log('Hello, World!);'"));

    InputFile inputFile = mock(InputFile.class);
    when(inputFile.key()).thenReturn(testFile.toAbsolutePath().toString());

    WriteCache cache = mock(WriteCache.class);
    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(0, InputStream.class);
      var archive = new ZipInputStream(new BufferedInputStream(inputStream));
      assertThat(archive.getNextEntry().getName()).isEqualTo("file_js_1.ucfg");
      assertThat(new String(archive.readAllBytes(), StandardCharsets.UTF_8)).isEqualTo(ucfgFiles.get(0));
      assertThat(archive.getNextEntry().getName()).isEqualTo("file_js_2.ucfg");
      assertThat(new String(archive.readAllBytes(), StandardCharsets.UTF_8)).isEqualTo(ucfgFiles.get(1));
      assertThat(archive.getNextEntry()).isNull();
      return null;
    }).when(cache).write(eq("jssecurity:ucfgs:test.js"), any(InputStream.class));

    SensorContext context = mock(SensorContext.class);
    when(context.nextCache()).thenReturn(cache);

    Function<InputFile, List<String>> function = mock(Function.class);
    when(function.apply(inputFile)).thenReturn(ucfgFiles);

    var wrapper = new CacheAnalysisWrapper(context, function);
    assertThat(wrapper.apply(inputFile)).isEqualTo(ucfgFiles);
  }

  private String toAbsolutePath(Path path) {
    return path.toAbsolutePath().toString();
  }

  private Path createFile(String filename) {
    try {
      var filePath = projectDir.resolve(filename);
      Files.createDirectories(filePath.getParent());
      Files.write(filePath, List.of(filePath.toAbsolutePath().toString()), StandardCharsets.UTF_8);
      return filePath;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

}
