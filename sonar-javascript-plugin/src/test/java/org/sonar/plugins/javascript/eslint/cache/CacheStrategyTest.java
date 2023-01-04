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
package org.sonar.plugins.javascript.eslint.cache;

import com.google.gson.Gson;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.TestUtils;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;
import org.sonar.plugins.javascript.eslint.PluginInfo;

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
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.readAndWrite;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.writeOnly;

@SuppressWarnings("resource")
class CacheStrategyTest {

  CacheAnalysisSerialization serialization;
  String jsonCacheKey;
  String seqCacheKey;
  String cpdCacheKey;
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
  List<EslintBridgeServer.CpdToken> cpdTokens;

  @BeforeEach
  void setUp() {
    // reset is required as this static value might be set by another test
    PluginInfo.setUcfgPluginVersion(null);
    workDir = baseDir.resolve(".scannerwork");

    fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    inputFile = mock(InputFile.class);
    var testFile = createFile(baseDir.resolve("src/test.js"));
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key()).thenReturn(baseDir.relativize(testFile).toString().replace(File.separator, "/"));

    previousCache = mock(ReadCache.class);
    nextCache = mock(WriteCache.class);
    context = mock(SensorContext.class);
    serialization = new CacheAnalysisSerialization(context, CacheKey.forFile(inputFile));

    jsonCacheKey = CacheKey.forFile(inputFile).forUcfg().withPrefix(UCFGFilesSerialization.JSON_PREFIX).toString();
    seqCacheKey = CacheKey.forFile(inputFile).forUcfg().withPrefix(UCFGFilesSerialization.SEQ_PREFIX).toString();
    cpdCacheKey = CacheKey.forFile(inputFile).forCpd().toString();

    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 6));
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarQube(Version.create(9, 6), SonarQubeSide.SCANNER, SonarEdition.ENTERPRISE));
    when(context.previousCache()).thenReturn(previousCache);
    when(context.nextCache()).thenReturn(nextCache);
    when(context.fileSystem()).thenReturn(fileSystem);

    cpdTokens = new Gson().fromJson(TestUtils.CPD_TOKENS, CpdData.class).getCpdTokens();
  }

  @Test
  void should_generate_cache_keys() {
    assertThat(jsonCacheKey).isEqualTo("jssecurity:ucfgs:JSON:src/test.js");
    assertThat(seqCacheKey).isEqualTo("jssecurity:ucfgs:SEQ:src/test.js");
    assertThat(cpdCacheKey).isEqualTo("js:cpd:data:src/test.js");
  }

  @Test
  void should_not_fail_on_older_versions() {
    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 3));
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarQube(Version.create(9, 3), SonarQubeSide.SCANNER, SonarEdition.ENTERPRISE));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired()).isTrue();
    verify(context, never()).nextCache();
    verify(context, never()).previousCache();
  }

  @Test
  void should_not_fail_in_sonarlint() {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired()).isTrue();
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

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);

    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(1, InputStream.class);
      try (var counting = new CountingInputStream(inputStream)) {
        counting.transferTo(OutputStream.nullOutputStream());
        bytesRead[0] = counting.getBytesRead();
      }
      return null;
    }).when(nextCache).write(eq(seqCacheKey), any(InputStream.class));

    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      var manifest = new Gson().fromJson(new String(bytes, StandardCharsets.UTF_8), FilesManifest.class);
      var totalSize = manifest.getFileSizes().stream().reduce(0L, (n, size) -> n + size.getSize(), Long::sum);
      assertThat(totalSize).isEqualTo(bytesRead[0]);
      assertThat(manifest.getFileSizes())
        .hasSize(3)
        .extracting(FilesManifest.FileSize::getName)
        .containsExactly("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg", "ucfg/d/file_js_3.ucfg");
      return null;
    }).when(nextCache).write(eq(jsonCacheKey), any(byte[].class));

    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      var cpdData = new Gson().fromJson(new String(bytes, StandardCharsets.UTF_8), CpdData.class);
      assertThat(cpdData).isNotNull();
      assertThat(cpdData.getCpdTokens()).hasSize(cpdTokens.size());
      return null;
    }).when(nextCache).write(eq(cpdCacheKey), any(byte[].class));

    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    strategy.writeAnalysisToCache(new CacheAnalysis(ucfgFiles, cpdTokens.toArray(EslintBridgeServer.CpdToken[]::new)));
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdCacheKey), any(byte[].class));
  }

  @Test
  void should_handle_missing_files() {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    var generatedFiles = List.of("inexistent.ucfg");
    var cacheAnalysis = new CacheAnalysis(generatedFiles, cpdTokens.toArray(EslintBridgeServer.CpdToken[]::new));
    assertThatThrownBy(() -> strategy.writeAnalysisToCache(cacheAnalysis)).isInstanceOf(UncheckedIOException.class);
    verify(nextCache, never()).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache, never()).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache, never()).write(eq(cpdCacheKey), any(byte[].class));
  }

  @Test
  void should_write_an_empty_archive_in_cache() throws IOException {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);

    doAnswer(invocation -> {
      var inputStream = invocation.getArgument(1, InputStream.class);
      try (var counting = new CountingInputStream(inputStream)) {
        counting.transferTo(OutputStream.nullOutputStream());
        assertThat(counting.getBytesRead()).isZero();
      }
      return null;
    }).when(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      assertThat(new String(bytes, StandardCharsets.UTF_8)).isEqualTo("{\"fileSizes\":[]}");
      return null;
    }).when(nextCache).write(eq(jsonCacheKey), any(byte[].class));

    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    strategy.writeAnalysisToCache(CacheAnalysis.fromResponse(null, cpdTokens.toArray(EslintBridgeServer.CpdToken[]::new)));
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdCacheKey), any(byte[].class));
  }

  @Test
  void should_read_from_cache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired()).isFalse();

    verify(previousCache).read(jsonCacheKey);
    verify(nextCache).copyFromPrevious(jsonCacheKey);
    verify(previousCache).read(seqCacheKey);
    verify(nextCache).copyFromPrevious(seqCacheKey);
    verify(previousCache).read(cpdCacheKey);
    verify(nextCache).copyFromPrevious(cpdCacheKey);

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      assertThat(workDir.resolve(ucfgFileRelativePath))
        .isRegularFile()
        .extracting(this::readFile)
        .isEqualTo(tempDir.resolve(ucfgFileRelativePath).toAbsolutePath().toString());
    }

    var ucfgPaths = ucfgFileRelativePaths.stream().map(workDir::resolve).map(Path::toString).collect(toList());
    strategy.writeAnalysisToCache(new CacheAnalysis(ucfgPaths, cpdTokens.toArray(EslintBridgeServer.CpdToken[]::new)));
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdCacheKey), any(byte[].class));
  }

  @Test
  void should_handle_null_ucfg_manifest_json() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(jsonCacheKey)).thenReturn(InputStream.nullInputStream());

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(previousCache, never()).read(cpdCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdCacheKey);
  }

  @Test
  void should_handle_invalid_ucfg_manifest_json() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(jsonCacheKey)).thenReturn(inputStream("invalid-json"));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(previousCache, never()).read(cpdCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdCacheKey);
  }

  @Test
  void should_handle_invalid_cpd_tokens_json() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(cpdCacheKey)).thenReturn(inputStream("invalid-json"));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(previousCache).read(seqCacheKey);
    verify(previousCache).read(cpdCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdCacheKey);
  }

  @Test
  void should_handle_null_cpd_tokens_json() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(cpdCacheKey)).thenReturn(inputStream("{}"));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(previousCache).read(seqCacheKey);
    verify(previousCache).read(cpdCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdCacheKey);
  }

  @Test
  void should_handle_empty_files() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.read(seqCacheKey)).thenReturn(InputStream.nullInputStream());
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();
  }

  @Test
  void should_handle_infinite_files() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.read(seqCacheKey)).thenReturn(new InfiniteCircularInputStream(new byte[] { 32 }));
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();
  }

  @Test
  void should_check_file_status() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.CHANGED);

    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      createFile(workDir.resolve(ucfgFileRelativePath));
    }

    verify(previousCache, never()).read(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(previousCache, never()).read(cpdCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdCacheKey);

    var ucfgPaths = ucfgFileRelativePaths.stream().map(workDir::resolve).map(Path::toString).collect(toList());
    strategy.writeAnalysisToCache(new CacheAnalysis(ucfgPaths, cpdTokens.toArray(EslintBridgeServer.CpdToken[]::new)));
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdCacheKey), any(byte[].class));
  }

  @Test
  void should_check_analysis_status() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(context.canSkipUnchangedFiles()).thenReturn(false);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      createFile(workDir.resolve(ucfgFileRelativePath));
    }

    verify(previousCache, never()).read(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(previousCache, never()).read(cpdCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdCacheKey);

    var ucfgPaths = ucfgFileRelativePaths.stream().map(workDir::resolve).map(Path::toString).collect(toList());
    strategy.writeAnalysisToCache(new CacheAnalysis(ucfgPaths, cpdTokens.toArray(EslintBridgeServer.CpdToken[]::new)));
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdCacheKey), any(byte[].class));
  }

  @Test
  void should_log() {
    when(inputFile.toString()).thenReturn("test.js");
    assertThat(CacheStrategies.getLogMessage(readAndWrite(CacheAnalysis.fromCache(new EslintBridgeServer.CpdToken[0]), serialization), inputFile, "this is a test"))
      .isEqualTo("Cache strategy set to 'READ_AND_WRITE' for file 'test.js' as this is a test");
    assertThat(CacheStrategies.getLogMessage(writeOnly(serialization), inputFile, null))
      .isEqualTo("Cache strategy set to 'WRITE_ONLY' for file 'test.js'");
  }

  @Test
  void should_iterate_files() {
    var ucfgFiles = createUcfgFiles(tempDir).stream().map(tempDir::resolve).collect(toList());
    var iterator = new FileIterator(ucfgFiles);
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

  private List<String> createUcfgFilesInCache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFiles(tempDir);
    var ucfgFiles = ucfgFileRelativePaths.stream()
      .map(tempDir::resolve)
      .map(this::createFile)
      .map(Path::toString)
      .collect(toList());
    var binFile = Files.createTempFile("ucfgs", ".bin");
    var jsonFile = Files.createTempFile("ucfgs", ".json");

    var tempCache = mock(WriteCache.class);
    doAnswer(invocation -> {
      var input = invocation.getArgument(1, InputStream.class);
      Files.copy(input, binFile, StandardCopyOption.REPLACE_EXISTING);
      return null;
    }).when(tempCache).write(eq(seqCacheKey), any(InputStream.class));
    doAnswer(invocation -> {
      var bytes = invocation.getArgument(1, byte[].class);
      Files.deleteIfExists(jsonFile);
      Files.write(jsonFile, bytes);
      return null;
    }).when(tempCache).write(eq(jsonCacheKey), any(byte[].class));

    when(fileSystem.workDir()).thenReturn(tempDir.toFile());
    when(context.nextCache()).thenReturn(tempCache);
    serialization.writeToCache(CacheAnalysis.fromResponse(ucfgFiles, new EslintBridgeServer.CpdToken[0]));
    when(fileSystem.workDir()).thenReturn(workDir.toFile());
    when(context.nextCache()).thenReturn(nextCache);

    when(previousCache.read(jsonCacheKey)).thenReturn(inputStream(jsonFile));
    when(previousCache.read(seqCacheKey)).thenReturn(inputStream(binFile));
    when(previousCache.read(cpdCacheKey)).thenReturn(inputStream(new CpdData(cpdTokens)));
    when(previousCache.contains(jsonCacheKey)).thenReturn(true);
    when(previousCache.contains(seqCacheKey)).thenReturn(true);
    when(previousCache.contains(cpdCacheKey)).thenReturn(true);

    return ucfgFileRelativePaths;
  }

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

  private static InputStream inputStream(String string) {
    return new ByteArrayInputStream(string.getBytes(StandardCharsets.UTF_8));
  }

  private static InputStream inputStream(Object object) {
    return inputStream(new Gson().toJson(object));
  }

  private static InputStream inputStream(Path path) throws IOException {
    return new BufferedInputStream(Files.newInputStream(path));
  }

}
