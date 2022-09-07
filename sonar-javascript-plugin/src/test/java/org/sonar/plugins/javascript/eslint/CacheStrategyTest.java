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
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;

import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CacheStrategyTest {

  FileSerializers.ZipFileSerializer serializer = new FileSerializers.ZipFileSerializer();

  @TempDir
  Path baseDir;

  @Test
  void should_work_on_older_versions() throws IOException {
    SensorContext context = mock(SensorContext.class);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 3)));

    InputFile inputFile = mock(InputFile.class);

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();
    verify(context, never()).nextCache();
    verify(context, never()).previousCache();
  }

  @Test
  void should_write_an_archive_in_cache() throws IOException {
    var workDir = baseDir.resolve(".scannerwork");
    var testFile = createFile(baseDir.resolve("src/test.js"));
    var ucfgFiles = Stream.of("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg")
      .map(workDir::resolve)
      .map(this::createFile)
      .map(Path::toString)
      .collect(toList());

    InputFile inputFile = mock(InputFile.class);
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key()).thenReturn(baseDir.relativize(testFile).toString());
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    ReadCache previousCache = mock(ReadCache.class);
    when(previousCache.contains(anyString())).thenReturn(false);

    WriteCache nextCache = mock(WriteCache.class);
    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(1, InputStream.class);
      try (var archive = new ZipInputStream(new BufferedInputStream(inputStream))) {
        assertThat(archive.getNextEntry()).isNotNull().extracting(ZipEntry::getName).isEqualTo("ucfg/file_js_1.ucfg");
        assertThat(new String(archive.readAllBytes(), StandardCharsets.UTF_8).trim()).isEqualTo(ucfgFiles.get(0));
        assertThat(archive.getNextEntry()).isNotNull().extracting(ZipEntry::getName).isEqualTo("ucfg/file_js_2.ucfg");
        assertThat(new String(archive.readAllBytes(), StandardCharsets.UTF_8).trim()).isEqualTo(ucfgFiles.get(1));
        assertThat(archive.getNextEntry()).isNull();
      }
      return null;
    }).when(nextCache).write(eq("jssecurity:ucfgs:src/test.js"), any(InputStream.class));

    FileSystem fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    SensorContext context = mock(SensorContext.class);
    when(context.previousCache()).thenReturn(previousCache);
    when(context.nextCache()).thenReturn(nextCache);
    when(context.fileSystem()).thenReturn(fileSystem);
    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 6));
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    strategy.writeGeneratedFilesToCache(context, inputFile, ucfgFiles.toArray(String[]::new));
    verify(nextCache).write(eq("jssecurity:ucfgs:src/test.js"), any(InputStream.class));
  }

  @Test
  void should_write_an_empty_archive_in_cache() throws IOException {
    var workDir = baseDir.resolve(".scannerwork");
    var testFile = createFile(baseDir.resolve("src/test.js"));

    InputFile inputFile = mock(InputFile.class);
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key()).thenReturn(baseDir.relativize(testFile).toString());
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    ReadCache previousCache = mock(ReadCache.class);
    when(previousCache.contains(anyString())).thenReturn(false);

    WriteCache nextCache = mock(WriteCache.class);
    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(1, InputStream.class);
      try (var archive = new ZipInputStream(new BufferedInputStream(inputStream))) {
        assertThat(archive.getNextEntry()).isNull();
      }
      return null;
    }).when(nextCache).write(eq("jssecurity:ucfgs:src/test.js"), any(InputStream.class));

    FileSystem fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    SensorContext context = mock(SensorContext.class);
    when(context.previousCache()).thenReturn(previousCache);
    when(context.nextCache()).thenReturn(nextCache);
    when(context.fileSystem()).thenReturn(fileSystem);
    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 6));
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    strategy.writeGeneratedFilesToCache(context, inputFile, null);
    verify(nextCache).write(eq("jssecurity:ucfgs:src/test.js"), any(InputStream.class));
  }

  @Test
  void should_read_an_archive_from_cache() throws IOException {
    var workDir = baseDir.resolve(".scannerwork");
    var zipDirectory = Files.createTempDirectory("archive");
    var ucfgFileRelativePaths = List.of("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg");

    var ucfgFiles = ucfgFileRelativePaths.stream()
      .map(zipDirectory::resolve)
      .map(this::createFile)
      .collect(toList());
    var zipFile = Files.createTempFile("archive", ".zip");
    Files.copy(serializer.serializeFiles(zipDirectory, ucfgFiles), zipFile, StandardCopyOption.REPLACE_EXISTING);

    var testFile = createFile(baseDir.resolve("src/test.js"));
    InputFile inputFile = mock(InputFile.class);
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key()).thenReturn(baseDir.relativize(testFile).toString());
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    ReadCache previousCache = mock(ReadCache.class);
    when(previousCache.read("jssecurity:ucfgs:src/test.js")).thenReturn(new BufferedInputStream(Files.newInputStream(zipFile)));
    when(previousCache.contains("jssecurity:ucfgs:src/test.js")).thenReturn(true);

    WriteCache nextCache = mock(WriteCache.class);

    FileSystem fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    SensorContext context = mock(SensorContext.class);
    when(context.previousCache()).thenReturn(previousCache);
    when(context.nextCache()).thenReturn(nextCache);
    when(context.fileSystem()).thenReturn(fileSystem);
    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 6));
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isFalse();

    verify(previousCache).read("jssecurity:ucfgs:src/test.js");
    verify(nextCache).copyFromPrevious("jssecurity:ucfgs:src/test.js");

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      assertThat(workDir.resolve(ucfgFileRelativePath))
        .isRegularFile()
        .extracting(this::readFile)
        .isEqualTo(zipDirectory.resolve(ucfgFileRelativePath).toAbsolutePath().toString());
    }

    strategy.writeGeneratedFilesToCache(context, inputFile, ucfgFiles.stream().map(Path::toString).toArray(String[]::new));
    verify(nextCache, never()).write(anyString(), any(InputStream.class));
  }

  @Test
  void should_log() {
    InputFile inputFile = mock(InputFile.class);
    when(inputFile.toString()).thenReturn("test.js");
    assertThat(CacheStrategy.getLogMessage(CacheStrategy.READ_AND_WRITE, inputFile, "this is a test"))
      .isEqualTo("Cache strategy set to 'READ_AND_WRITE' for file 'test.js' as this is a test");
    assertThat(CacheStrategy.getLogMessage(CacheStrategy.WRITE_ONLY, inputFile, null))
      .isEqualTo("Cache strategy set to 'WRITE_ONLY' for file 'test.js'");
  }

  private String readFile(Path file) {
    try {
      return Files.readString(file, StandardCharsets.UTF_8).trim();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private Path createFile(Path filePath) {
    try {
      Files.createDirectories(filePath.getParent());
      Files.write(filePath, List.of(filePath.toAbsolutePath().toString()), StandardCharsets.UTF_8);
      return filePath;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

}
