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

import com.google.gson.Gson;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.IntStream;
import org.apache.commons.compress.utils.CountingInputStream;
import org.apache.commons.io.input.InfiniteCircularInputStream;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.BeforeEach;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.eslint.CacheSerialization.json;

@SuppressWarnings("resource")
class CacheStrategyTest {

  static final String JSON_CACHE_KEY = "jssecurity:ucfgs:9.6:JSON:src/test.js";
  static final String SEQ_CACHE_KEY = "jssecurity:ucfgs:9.6:SEQ:src/test.js";
  static final CacheSerialization.JsonSerialization<CacheSerialization.FilesManifest> JSON = json(CacheSerialization.FilesManifest.class);
  static final CacheSerialization.SequenceSerialization SEQUENCE = CacheSerialization.sequence();

  @TempDir
  Path baseDir;
  @TempDir
  Path tempDir;
  InputFile inputFile;
  SensorContext context;
  ReadCache previousCache;
  WriteCache nextCache;
  FileSystem fileSystem;
  Path workDir;

  @BeforeEach
  void setUp() {
    workDir = baseDir.resolve(".scannerwork");

    fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    inputFile = mock(InputFile.class);
    previousCache = mock(ReadCache.class);
    nextCache = mock(WriteCache.class);
    context = mock(SensorContext.class);

    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 6));
    when(context.previousCache()).thenReturn(previousCache);
    when(context.nextCache()).thenReturn(nextCache);
    when(context.fileSystem()).thenReturn(fileSystem);
  }

  @Test
  void should_work_on_older_versions() {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 3)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();
    verify(context, never()).nextCache();
    verify(context, never()).previousCache();
  }

  @Test
  void should_write_to_cache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFiles(workDir);
    var ucfgFiles = ucfgFileRelativePaths.stream()
      .map(workDir::resolve)
      .map(Path::toAbsolutePath)
      .map(Path::toString)
      .collect(toList());
    long[] bytesRead = {0L};

    setUpInputFile(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);

    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(1, InputStream.class);
      try (var counting = new CountingInputStream(inputStream)) {
        counting.transferTo(OutputStream.nullOutputStream());
        bytesRead[0] = counting.getBytesRead();
      }
      return null;
    }).when(nextCache).write(eq(SEQ_CACHE_KEY), any(InputStream.class));

    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      var manifest = new Gson().fromJson(new String(bytes, StandardCharsets.UTF_8), CacheSerialization.FilesManifest.class);
      var totalSize = manifest.getFileSizes().stream().reduce(0L, (n, size) -> n + size.getSize(), Long::sum);
      assertThat(totalSize).isEqualTo(bytesRead[0]);
      assertThat(manifest.getFileSizes())
        .hasSize(3)
        .extracting(CacheSerialization.FilesManifest.FileSize::getName)
        .containsExactly("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg", "ucfg/d/file_js_3.ucfg");
      return null;
    }).when(nextCache).write(eq(JSON_CACHE_KEY), any(byte[].class));

    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    strategy.writeGeneratedFilesToCache(context, inputFile, ucfgFiles.toArray(String[]::new));
    verify(nextCache).write(eq(JSON_CACHE_KEY), any(byte[].class));
    verify(nextCache).write(eq(SEQ_CACHE_KEY), any(InputStream.class));
  }

  @Test
  void should_handle_missing_files() {
    setUpInputFile(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    assertThatThrownBy(() -> strategy.writeGeneratedFilesToCache(context, inputFile, new String[] { "inexistant.ucfg" }))
      .isInstanceOf(UncheckedIOException.class);
    verify(nextCache, never()).write(eq(JSON_CACHE_KEY), any(byte[].class));
    verify(nextCache, never()).write(eq(SEQ_CACHE_KEY), any(InputStream.class));
  }

  @Test
  void should_write_an_empty_archive_in_cache() throws IOException {
    setUpInputFile(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);

    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(1, InputStream.class);
      try (var counting = new CountingInputStream(inputStream)) {
        counting.transferTo(OutputStream.nullOutputStream());
        assertThat(counting.getBytesRead()).isZero();
      }
      return null;
    }).when(nextCache).write(eq(SEQ_CACHE_KEY), any(InputStream.class));
    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      assertThat(new String(bytes, StandardCharsets.UTF_8)).isEqualTo("{\"fileSizes\":[]}");
      return null;
    }).when(nextCache).write(eq(JSON_CACHE_KEY), any(byte[].class));

    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    strategy.writeGeneratedFilesToCache(context, inputFile, null);
    verify(nextCache).write(eq(JSON_CACHE_KEY), any(byte[].class));
    verify(nextCache).write(eq(SEQ_CACHE_KEY), any(InputStream.class));
  }

  @Test
  void should_read_from_cache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    setUpInputFile(InputFile.Status.SAME);

    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isFalse();

    verify(previousCache).read(JSON_CACHE_KEY);
    verify(nextCache).copyFromPrevious(JSON_CACHE_KEY);
    verify(previousCache).read(SEQ_CACHE_KEY);
    verify(nextCache).copyFromPrevious(SEQ_CACHE_KEY);

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      assertThat(workDir.resolve(ucfgFileRelativePath))
        .isRegularFile()
        .extracting(this::readFile)
        .isEqualTo(tempDir.resolve(ucfgFileRelativePath).toAbsolutePath().toString());
    }

    strategy.writeGeneratedFilesToCache(context, inputFile, ucfgFileRelativePaths.stream().map(workDir::resolve).map(Path::toString).toArray(String[]::new));
    verify(nextCache, never()).write(anyString(), any(byte[].class));
  }

  @Test
  void should_handle_empty_files() throws IOException {
    createUcfgFilesInCache();

    setUpInputFile(InputFile.Status.SAME);

    when(previousCache.read(SEQ_CACHE_KEY)).thenReturn(InputStream.nullInputStream());
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();
  }

  @Test
  void should_handle_infinite_files() throws IOException {
    createUcfgFilesInCache();

    setUpInputFile(InputFile.Status.SAME);

    when(previousCache.read(SEQ_CACHE_KEY)).thenReturn(new InfiniteCircularInputStream(new byte[] { 32 }));
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();
  }

  @Test
  void should_check_file_status() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    setUpInputFile(InputFile.Status.CHANGED);

    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      createFile(workDir.resolve(ucfgFileRelativePath));
    }

    verify(previousCache, never()).read(JSON_CACHE_KEY);
    verify(nextCache, never()).copyFromPrevious(JSON_CACHE_KEY);
    verify(previousCache, never()).read(SEQ_CACHE_KEY);
    verify(nextCache, never()).copyFromPrevious(SEQ_CACHE_KEY);

    strategy.writeGeneratedFilesToCache(context, inputFile, ucfgFileRelativePaths.stream().map(workDir::resolve).map(Path::toString).toArray(String[]::new));
    verify(nextCache).write(eq(JSON_CACHE_KEY), any(byte[].class));
    verify(nextCache).write(eq(SEQ_CACHE_KEY), any(InputStream.class));
  }

  @Test
  void should_check_analysis_status() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    setUpInputFile(InputFile.Status.SAME);

    when(context.canSkipUnchangedFiles()).thenReturn(false);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategy.getStrategyFor(context, inputFile);
    assertThat(strategy).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired(context, inputFile)).isTrue();

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      createFile(workDir.resolve(ucfgFileRelativePath));
    }

    verify(previousCache, never()).read(JSON_CACHE_KEY);
    verify(nextCache, never()).copyFromPrevious(JSON_CACHE_KEY);
    verify(previousCache, never()).read(SEQ_CACHE_KEY);
    verify(nextCache, never()).copyFromPrevious(SEQ_CACHE_KEY);

    strategy.writeGeneratedFilesToCache(context, inputFile, ucfgFileRelativePaths.stream().map(workDir::resolve).map(Path::toString).toArray(String[]::new));
    verify(nextCache).write(eq(JSON_CACHE_KEY), any(byte[].class));
    verify(nextCache).write(eq(SEQ_CACHE_KEY), any(InputStream.class));
  }

  @Test
  void should_log() {
    when(inputFile.toString()).thenReturn("test.js");
    assertThat(CacheStrategy.getLogMessage(CacheStrategy.READ_AND_WRITE, inputFile, "this is a test"))
      .isEqualTo("Cache strategy set to 'READ_AND_WRITE' for file 'test.js' as this is a test");
    assertThat(CacheStrategy.getLogMessage(CacheStrategy.WRITE_ONLY, inputFile, null))
      .isEqualTo("Cache strategy set to 'WRITE_ONLY' for file 'test.js'");
  }

  @Test
  void should_iterate_files() {
    var ucfgFiles = createUcfgFiles(tempDir).stream().map(tempDir::resolve).collect(toList());
    var iterator = new CacheSerialization.FileIterator(ucfgFiles);
    IntStream.range(0, ucfgFiles.size()).forEach(i -> {
      assertThat(iterator.hasNext()).isTrue();
      assertThat(iterator.next()).isNotNull();
    });
    assertThatThrownBy(iterator::next).isInstanceOf(NoSuchElementException.class);
  }

  private String readFile(Path file) {
    try {
      return Files.readString(file, StandardCharsets.UTF_8).trim();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private void setUpInputFile(InputFile.Status status) {
    var testFile = createFile(baseDir.resolve("src/test.js"));
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key()).thenReturn(baseDir.relativize(testFile).toString());
    when(inputFile.status()).thenReturn(status);
  }

  private List<String> createUcfgFilesInCache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFiles(tempDir);
    var ucfgFiles = ucfgFileRelativePaths.stream()
      .map(tempDir::resolve)
      .map(this::createFile)
      .map(Path::toString)
      .toArray(String[]::new);
    var binFile = Files.createTempFile("ucfgs", ".bin");
    var jsonFile = Files.createTempFile("ucfgs", ".json");

    var tempCache = mock(WriteCache.class);
    doAnswer(invocation -> {
      var input = invocation.getArgument(1, InputStream.class);
      Files.copy(input, binFile, StandardCopyOption.REPLACE_EXISTING);
      return null;
    }).when(tempCache).write(anyString(), any(InputStream.class));
    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      Files.deleteIfExists(jsonFile);
      Files.write(jsonFile, bytes);
      return null;
    }).when(tempCache).write(anyString(), any(byte[].class));
    var manifest = SEQUENCE.writeCache(tempCache, "bin", new CacheSerialization.GeneratedFiles(tempDir, ucfgFiles));
    JSON.writeCache(tempCache, "json", manifest);

    when(previousCache.read(JSON_CACHE_KEY)).thenReturn(new BufferedInputStream(Files.newInputStream(jsonFile)));
    when(previousCache.read(SEQ_CACHE_KEY)).thenReturn(new BufferedInputStream(Files.newInputStream(binFile)));
    when(previousCache.contains(JSON_CACHE_KEY)).thenReturn(true);
    when(previousCache.contains(SEQ_CACHE_KEY)).thenReturn(true);

    return ucfgFileRelativePaths;
  }

  @NotNull
  private List<String> createUcfgFiles(Path dir) {
    var ucfgFileRelativePaths = List.of("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg", "ucfg/d/file_js_3.ucfg");
    ucfgFileRelativePaths.stream().map(dir::resolve).forEach(this::createFile);
    return ucfgFileRelativePaths;
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
