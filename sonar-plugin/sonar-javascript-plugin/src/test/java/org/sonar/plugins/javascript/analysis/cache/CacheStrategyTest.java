/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis.cache;

import static java.util.Collections.emptyList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.readAndWrite;
import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.writeOnly;
import static org.sonar.plugins.javascript.analysis.cache.CacheTestUtils.inputStream;

import com.google.gson.Gson;
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
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer.CpdToken;
import org.sonar.plugins.javascript.bridge.PluginInfo;

@SuppressWarnings("resource")
class CacheStrategyTest {

  static final List<CpdToken> CPD_TOKENS = CacheTestUtils.getCpdTokens();
  static final String PLUGIN_VERSION = "1.0.0";

  CacheAnalysisSerialization serialization;
  String jsonCacheKey;
  String seqCacheKey;
  String cpdDataCacheKey;
  String cpdStringTableCacheKey;
  String metadataCacheKey;

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

  @RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @BeforeEach
  void setUp() throws Exception {
    // reset is required as this static value might be set by another test
    PluginInfo.setUcfgPluginVersion(null);
    workDir = baseDir.resolve(".scannerwork");

    fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    inputFile = mock(InputFile.class);
    var testFile = createFile(baseDir.resolve("src/test.js"));
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key())
      .thenReturn(baseDir.relativize(testFile).toString().replace(File.separator, "/"));
    doReturn("Hello World!").when(inputFile).contents();
    when(inputFile.charset()).thenReturn(StandardCharsets.UTF_8);

    previousCache = mock(ReadCache.class);
    nextCache = mock(WriteCache.class);
    context = mock(SensorContext.class);
    serialization =
      new CacheAnalysisSerialization(context, CacheKey.forFile(inputFile, PLUGIN_VERSION));

    jsonCacheKey =
      CacheKey
        .forFile(inputFile, PLUGIN_VERSION)
        .forUcfg()
        .withPrefix(UCFGFilesSerialization.JSON_PREFIX)
        .toString();
    seqCacheKey =
      CacheKey
        .forFile(inputFile, PLUGIN_VERSION)
        .forUcfg()
        .withPrefix(UCFGFilesSerialization.SEQ_PREFIX)
        .toString();
    cpdDataCacheKey =
      CacheKey
        .forFile(inputFile, PLUGIN_VERSION)
        .forCpd()
        .withPrefix(CpdSerialization.DATA_PREFIX)
        .toString();
    cpdStringTableCacheKey =
      CacheKey
        .forFile(inputFile, PLUGIN_VERSION)
        .forCpd()
        .withPrefix(CpdSerialization.STRING_TABLE_PREFIX)
        .toString();
    metadataCacheKey = CacheKey.forFile(inputFile, PLUGIN_VERSION).forFileMetadata().toString();

    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 6));
    when(context.runtime())
      .thenReturn(
        SonarRuntimeImpl.forSonarQube(
          Version.create(9, 6),
          SonarQubeSide.SCANNER,
          SonarEdition.ENTERPRISE
        )
      );
    when(context.previousCache()).thenReturn(previousCache);
    when(context.nextCache()).thenReturn(nextCache);
    when(context.fileSystem()).thenReturn(fileSystem);

    when(previousCache.contains(metadataCacheKey)).thenReturn(true);
    var metadata = inputStream(new Gson().toJson(FileMetadata.from(inputFile)));
    when(previousCache.read(metadataCacheKey)).thenReturn(metadata);
  }

  @Test
  void should_generate_cache_keys() {
    assertThat(
      CacheKey.forFile(inputFile, null).forUcfg().withPrefix(UCFGFilesSerialization.JSON_PREFIX)
    )
      .hasToString("jssecurity:ucfgs:JSON:src/test.js");
    assertThat(
      CacheKey.forFile(inputFile, null).forUcfg().withPrefix(UCFGFilesSerialization.SEQ_PREFIX)
    )
      .hasToString("jssecurity:ucfgs:SEQ:src/test.js");
    assertThat(jsonCacheKey).isEqualTo("jssecurity:ucfgs:JSON:1.0.0:src/test.js");
    assertThat(seqCacheKey).isEqualTo("jssecurity:ucfgs:SEQ:1.0.0:src/test.js");
    assertThat(cpdDataCacheKey).isEqualTo("js:cpd:DATA:1.0.0:src/test.js");
    assertThat(cpdStringTableCacheKey).isEqualTo("js:cpd:STRING_TABLE:1.0.0:src/test.js");
  }

  @Test
  void should_not_fail_on_older_versions() throws Exception {
    when(context.getSonarQubeVersion()).thenReturn(Version.create(9, 3));
    when(context.runtime())
      .thenReturn(
        SonarRuntimeImpl.forSonarQube(
          Version.create(9, 3),
          SonarQubeSide.SCANNER,
          SonarEdition.ENTERPRISE
        )
      );

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired()).isTrue();
    verify(context, never()).nextCache();
    verify(context, never()).previousCache();
  }

  @Test
  void should_not_fail_in_sonarlint() throws Exception {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired()).isTrue();
    verify(context, never()).nextCache();
    verify(context, never()).previousCache();
  }

  @Test
  void should_write_to_cache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFiles(workDir);
    var ucfgFiles = ucfgFileRelativePaths
      .stream()
      .map(workDir::resolve)
      .map(Path::toAbsolutePath)
      .map(Path::toString)
      .toList();
    long bytesRead;

    when(previousCache.contains(anyString())).thenReturn(false);

    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    strategy.writeAnalysisToCache(
      new CacheAnalysis(ucfgFiles, CPD_TOKENS.toArray(CpdToken[]::new)),
      inputFile
    );

    var sequenceCaptor = ArgumentCaptor.forClass(InputStream.class);
    verify(nextCache).write(eq(seqCacheKey), sequenceCaptor.capture());
    try (var counting = new CountingInputStream(sequenceCaptor.getValue())) {
      counting.transferTo(OutputStream.nullOutputStream());
      bytesRead = counting.getBytesRead();
    }

    var jsonCaptor = ArgumentCaptor.forClass(byte[].class);
    verify(nextCache).write(eq(jsonCacheKey), jsonCaptor.capture());
    var manifest = new Gson()
      .fromJson(new String(jsonCaptor.getValue(), StandardCharsets.UTF_8), FilesManifest.class);
    var totalSize = manifest
      .getFileSizes()
      .stream()
      .reduce(0L, (n, size) -> n + size.getSize(), Long::sum);
    assertThat(totalSize).isEqualTo(bytesRead);
    assertThat(manifest.getFileSizes())
      .hasSize(3)
      .extracting(FilesManifest.FileSize::getName)
      .containsExactly("ucfg/file_js_1.ucfg", "ucfg/file_js_2.ucfg", "ucfg/d/file_js_3.ucfg");

    var cpdDataCaptor = ArgumentCaptor.forClass(byte[].class);
    var cpdStringTableCaptor = ArgumentCaptor.forClass(byte[].class);
    verify(nextCache).write(eq(cpdDataCacheKey), cpdDataCaptor.capture());
    verify(nextCache).write(eq(cpdStringTableCacheKey), cpdStringTableCaptor.capture());

    var cpdData = CpdDeserializer.fromBinary(
      cpdDataCaptor.getValue(),
      cpdStringTableCaptor.getValue()
    );
    assertThat(cpdData.getCpdTokens())
      .usingRecursiveFieldByFieldElementComparator()
      .containsExactlyElementsOf(CPD_TOKENS);
  }

  @Test
  void should_handle_missing_files() throws Exception {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    var generatedFiles = List.of("inexistent.ucfg");
    var cacheAnalysis = new CacheAnalysis(
      generatedFiles,
      CPD_TOKENS.toArray(CpdToken[]::new)
    );
    assertThatThrownBy(() -> strategy.writeAnalysisToCache(cacheAnalysis, inputFile))
      .isInstanceOf(UncheckedIOException.class);
    verify(nextCache, never()).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache, never()).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache, never()).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache, never()).write(eq(cpdStringTableCacheKey), any(byte[].class));
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
      })
      .when(nextCache)
      .write(eq(seqCacheKey), any(InputStream.class));
    doAnswer(invocation -> {
        var bytes = invocation.getArgument(1, byte[].class);
        assertThat(new String(bytes, StandardCharsets.UTF_8)).isEqualTo("{\"fileSizes\":[]}");
        return null;
      })
      .when(nextCache)
      .write(eq(jsonCacheKey), any(byte[].class));

    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    strategy.writeAnalysisToCache(
      CacheAnalysis.fromResponse(null, CPD_TOKENS.toArray(CpdToken[]::new)),
      inputFile
    );
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_read_from_cache() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired()).isFalse();

    verify(previousCache).read(jsonCacheKey);
    verify(nextCache).copyFromPrevious(jsonCacheKey);
    verify(previousCache).read(seqCacheKey);
    verify(nextCache).copyFromPrevious(seqCacheKey);
    verify(previousCache).read(cpdDataCacheKey);
    verify(nextCache).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache).read(cpdStringTableCacheKey);
    verify(nextCache).copyFromPrevious(cpdStringTableCacheKey);

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      assertThat(workDir.resolve(ucfgFileRelativePath))
        .isRegularFile()
        .extracting(this::readFile)
        .isEqualTo(tempDir.resolve(ucfgFileRelativePath).toAbsolutePath().toString());
    }

    var ucfgPaths = ucfgFileRelativePaths
      .stream()
      .map(workDir::resolve)
      .map(Path::toString)
      .toList();
    strategy.writeAnalysisToCache(
      new CacheAnalysis(ucfgPaths, CPD_TOKENS.toArray(CpdToken[]::new)),
      inputFile
    );
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_handle_null_ucfg_manifest_json() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(jsonCacheKey)).thenReturn(InputStream.nullInputStream());

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);
  }

  @Test
  void should_handle_invalid_ucfg_manifest_json() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(jsonCacheKey)).thenReturn(inputStream("invalid-json"));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);
  }

  @Test
  void should_handle_invalid_cpd_tokens_serialization() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.read(cpdDataCacheKey)).thenReturn(inputStream("invalid-cpd-data"));
    when(previousCache.read(cpdStringTableCacheKey))
      .thenReturn(inputStream("invalid-cpd-stringTable"));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(jsonCacheKey);
    verify(previousCache).read(seqCacheKey);
    verify(previousCache).read(cpdDataCacheKey);
    verify(previousCache).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);
  }

  @Test
  void should_handle_different_version() throws IOException {
    var pluginVersion = "1.2.3";

    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var serializationResult = CpdSerializer.toBinary(new CpdData(emptyList()));
    when(previousCache.read(cpdDataCacheKey))
      .thenReturn(inputStream(serializationResult.getData()));
    when(previousCache.read(cpdStringTableCacheKey))
      .thenReturn(inputStream(serializationResult.getStringTable()));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, pluginVersion);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    var metadataCacheKey = CacheKey.forFile(inputFile, pluginVersion).forFileMetadata().toString();
    var jsonCacheKey = CacheKey
      .forFile(inputFile, pluginVersion)
      .forUcfg()
      .withPrefix(UCFGFilesSerialization.JSON_PREFIX)
      .toString();
    var seqCacheKey = CacheKey
      .forFile(inputFile, pluginVersion)
      .forUcfg()
      .withPrefix(UCFGFilesSerialization.SEQ_PREFIX)
      .toString();
    var cpdDataCacheKey = CacheKey
      .forFile(inputFile, pluginVersion)
      .forCpd()
      .withPrefix(CpdSerialization.DATA_PREFIX)
      .toString();
    var cpdStringTableCacheKey = CacheKey
      .forFile(inputFile, pluginVersion)
      .forCpd()
      .withPrefix(CpdSerialization.STRING_TABLE_PREFIX)
      .toString();

    verify(previousCache).contains(metadataCacheKey);
    verify(previousCache, never()).contains(jsonCacheKey);
    verify(previousCache, never()).contains(seqCacheKey);
    verify(previousCache, never()).contains(cpdDataCacheKey);
    verify(previousCache, never()).contains(cpdStringTableCacheKey);

    verify(previousCache, never()).read(metadataCacheKey);
    verify(previousCache, never()).read(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);

    verify(nextCache, never()).copyFromPrevious(metadataCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);
  }

  @Test
  void should_handle_empty_files() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.read(seqCacheKey)).thenReturn(InputStream.nullInputStream());
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();
  }

  @Test
  void should_handle_infinite_files() throws IOException {
    createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.read(seqCacheKey))
      .thenReturn(new InfiniteCircularInputStream(new byte[] { 32 }));
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();
  }

  @Test
  void should_check_file_status() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    when(inputFile.contents()).thenReturn("Changed");

    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      createFile(workDir.resolve(ucfgFileRelativePath));
    }

    verify(previousCache, never()).read(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);

    var ucfgPaths = ucfgFileRelativePaths
      .stream()
      .map(workDir::resolve)
      .map(Path::toString)
      .toList();
    strategy.writeAnalysisToCache(
      new CacheAnalysis(ucfgPaths, CPD_TOKENS.toArray(CpdToken[]::new)),
      inputFile
    );
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_check_analysis_status() throws IOException {
    var ucfgFileRelativePaths = createUcfgFilesInCache();

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(context.canSkipUnchangedFiles()).thenReturn(false);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    for (var ucfgFileRelativePath : ucfgFileRelativePaths) {
      createFile(workDir.resolve(ucfgFileRelativePath));
    }

    verify(previousCache, never()).read(jsonCacheKey);
    verify(nextCache, never()).copyFromPrevious(jsonCacheKey);
    verify(previousCache, never()).read(seqCacheKey);
    verify(nextCache, never()).copyFromPrevious(seqCacheKey);
    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);

    var ucfgPaths = ucfgFileRelativePaths
      .stream()
      .map(workDir::resolve)
      .map(Path::toString)
      .toList();
    strategy.writeAnalysisToCache(
      new CacheAnalysis(ucfgPaths, CPD_TOKENS.toArray(CpdToken[]::new)),
      inputFile
    );
    verify(nextCache).write(eq(jsonCacheKey), any(byte[].class));
    verify(nextCache).write(eq(seqCacheKey), any(InputStream.class));
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_log() {
    when(inputFile.toString()).thenReturn("test.js");
    assertThat(
      CacheStrategies.getLogMessage(
        readAndWrite(CacheAnalysis.fromCache(new CpdToken[0]), serialization),
        inputFile,
        "this is a test"
      )
    )
      .isEqualTo("Cache strategy set to 'READ_AND_WRITE' for file 'test.js' as this is a test");
    assertThat(CacheStrategies.getLogMessage(writeOnly(serialization), inputFile, null))
      .isEqualTo("Cache strategy set to 'WRITE_ONLY' for file 'test.js'");
  }

  @Test
  void should_iterate_files() {
    var ucfgFiles = createUcfgFiles(tempDir).stream().map(tempDir::resolve).toList();
    var iterator = new FileIterator(ucfgFiles);
    IntStream
      .range(0, ucfgFiles.size())
      .forEach(i -> {
        assertThat(iterator.hasNext()).isTrue();
        assertThat(iterator.next()).isNotNull();
      });
    assertThatThrownBy(iterator::next).isInstanceOf(NoSuchElementException.class);
  }

  @Test
  void should_check_file_hash() throws Exception {
    when(context.canSkipUnchangedFiles()).thenReturn(true);

    var inputFile = TestInputFileBuilder
      .create("dir", "file.ts")
      .setContents("abc")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    var pluginVersion = "1.0.0";
    var cacheKey = CacheKey.forFile(inputFile, pluginVersion);
    var metadataKey = cacheKey.forFileMetadata().toString();

    var cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile, pluginVersion);
    assertThat(cacheStrategy.getName()).isEqualTo("WRITE_ONLY");
    verify(previousCache).contains(metadataKey);
    verify(previousCache, never()).read(metadataKey);
    verify(previousCache, never()).contains(cacheKey.forUcfg().toString());

    reset(previousCache);
    when(previousCache.contains(metadataKey)).thenReturn(true);
    when(previousCache.read(metadataKey))
      .thenReturn(inputStream(new Gson().toJson(FileMetadata.from(inputFile))));
    CacheStrategies.getStrategyFor(context, inputFile, pluginVersion);

    verify(previousCache).contains(metadataKey);
    verify(previousCache).read(metadataKey);
    verify(previousCache)
      .contains(cacheKey.forUcfg().withPrefix(UCFGFilesSerialization.JSON_PREFIX).toString());
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
    var ucfgFiles = ucfgFileRelativePaths
      .stream()
      .map(tempDir::resolve)
      .map(this::createFile)
      .map(Path::toString)
      .toList();
    var binFile = Files.createTempFile("ucfgs", ".bin");
    var jsonFile = Files.createTempFile("ucfgs", ".json");

    var tempCache = mock(WriteCache.class);
    doAnswer(invocation -> {
        var input = invocation.getArgument(1, InputStream.class);
        Files.copy(input, binFile, StandardCopyOption.REPLACE_EXISTING);
        return null;
      })
      .when(tempCache)
      .write(eq(seqCacheKey), any(InputStream.class));
    doAnswer(invocation -> {
        var bytes = invocation.getArgument(1, byte[].class);
        Files.deleteIfExists(jsonFile);
        Files.write(jsonFile, bytes);
        return null;
      })
      .when(tempCache)
      .write(eq(jsonCacheKey), any(byte[].class));

    when(fileSystem.workDir()).thenReturn(tempDir.toFile());
    when(context.nextCache()).thenReturn(tempCache);
    serialization.writeToCache(
      CacheAnalysis.fromResponse(ucfgFiles, new CpdToken[0]),
      inputFile
    );
    when(fileSystem.workDir()).thenReturn(workDir.toFile());
    when(context.nextCache()).thenReturn(nextCache);

    when(previousCache.read(jsonCacheKey)).thenReturn(inputStream(jsonFile));
    when(previousCache.read(seqCacheKey)).thenReturn(inputStream(binFile));

    var serializationResult = CpdSerializer.toBinary(new CpdData(CPD_TOKENS));
    when(previousCache.read(cpdDataCacheKey))
      .thenReturn(inputStream(serializationResult.getData()));
    when(previousCache.read(cpdStringTableCacheKey))
      .thenReturn(inputStream(serializationResult.getStringTable()));
    when(previousCache.contains(jsonCacheKey)).thenReturn(true);
    when(previousCache.contains(seqCacheKey)).thenReturn(true);
    when(previousCache.contains(cpdDataCacheKey)).thenReturn(true);
    when(previousCache.contains(cpdStringTableCacheKey)).thenReturn(true);

    return ucfgFileRelativePaths;
  }

  private List<String> createUcfgFiles(Path dir) {
    var ucfgFileRelativePaths = List.of(
      "ucfg/file_js_1.ucfg",
      "ucfg/file_js_2.ucfg",
      "ucfg/d/file_js_3.ucfg"
    );
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
