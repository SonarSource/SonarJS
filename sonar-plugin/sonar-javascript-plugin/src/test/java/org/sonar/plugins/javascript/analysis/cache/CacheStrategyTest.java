/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis.cache;

import static java.util.Collections.emptyList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
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
import org.sonar.plugins.javascript.analysis.JsTsContext;
import org.sonar.plugins.javascript.bridge.BridgeServer.CpdToken;

@SuppressWarnings("resource")
class CacheStrategyTest {

  static final List<CpdToken> CPD_TOKENS = CacheTestUtils.getCpdTokens();
  static final String PLUGIN_VERSION = "1.0.0";

  CacheAnalysisSerialization serialization;
  String cpdDataCacheKey;
  String cpdStringTableCacheKey;
  String metadataCacheKey;
  String astCacheKey;

  @TempDir
  Path baseDir;

  @TempDir
  Path tempDir;

  InputFile inputFile;
  JsTsContext<?> context;
  SensorContext sensorContext;
  ReadCache previousCache;
  WriteCache nextCache;
  FileSystem fileSystem;
  Path workDir;

  @RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @BeforeEach
  void setUp() throws Exception {
    workDir = baseDir.resolve(".scannerwork");

    fileSystem = mock(FileSystem.class);
    when(fileSystem.baseDir()).thenReturn(baseDir.toFile());
    when(fileSystem.workDir()).thenReturn(workDir.toFile());

    inputFile = mock(InputFile.class);
    var testFile = createFile(baseDir.resolve("src/test.js"));
    when(inputFile.uri()).thenReturn(testFile.toUri());
    when(inputFile.key()).thenReturn(
      baseDir.relativize(testFile).toString().replace(File.separator, "/")
    );
    doReturn("Hello World!").when(inputFile).contents();
    when(inputFile.charset()).thenReturn(StandardCharsets.UTF_8);

    previousCache = mock(ReadCache.class);
    nextCache = mock(WriteCache.class);
    sensorContext = mock(SensorContext.class);
    context = new JsTsContext<>(sensorContext);
    serialization = new CacheAnalysisSerialization(
      sensorContext,
      CacheKey.forFile(inputFile, PLUGIN_VERSION)
    );

    cpdDataCacheKey = CacheKey.forFile(inputFile, PLUGIN_VERSION)
      .forCpd()
      .withPrefix(CpdSerialization.DATA_PREFIX)
      .toString();
    cpdStringTableCacheKey = CacheKey.forFile(inputFile, PLUGIN_VERSION)
      .forCpd()
      .withPrefix(CpdSerialization.STRING_TABLE_PREFIX)
      .toString();
    metadataCacheKey = CacheKey.forFile(inputFile, PLUGIN_VERSION).forFileMetadata().toString();
    astCacheKey = CacheKey.forFile(inputFile, PLUGIN_VERSION).forAst().toString();

    when(sensorContext.runtime()).thenReturn(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 6),
        SonarQubeSide.SCANNER,
        SonarEdition.ENTERPRISE
      )
    );
    when(sensorContext.previousCache()).thenReturn(previousCache);
    when(sensorContext.nextCache()).thenReturn(nextCache);
    when(sensorContext.fileSystem()).thenReturn(fileSystem);

    when(previousCache.contains(metadataCacheKey)).thenReturn(true);
    var metadata = inputStream(new Gson().toJson(FileMetadata.from(inputFile)));
    when(previousCache.read(metadataCacheKey)).thenReturn(metadata);

    when(previousCache.contains(astCacheKey)).thenReturn(true);
    when(previousCache.read(astCacheKey)).thenReturn(inputStream(new byte[0]));
  }

  @Test
  void should_generate_cache_keys() {
    assertThat(cpdDataCacheKey).isEqualTo("js:cpd:DATA:1.0.0:src/test.js");
    assertThat(cpdStringTableCacheKey).isEqualTo("js:cpd:STRING_TABLE:1.0.0:src/test.js");
  }

  @Test
  void should_not_fail_on_older_versions() throws Exception {
    when(sensorContext.getSonarQubeVersion()).thenReturn(Version.create(9, 3));
    when(sensorContext.runtime()).thenReturn(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 3),
        SonarQubeSide.SCANNER,
        SonarEdition.ENTERPRISE
      )
    );

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired()).isTrue();
    verify(sensorContext, never()).nextCache();
    verify(sensorContext, never()).previousCache();
  }

  @Test
  void should_not_fail_in_sonarlint() throws Exception {
    when(sensorContext.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 6)));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.NO_CACHE);
    assertThat(strategy.isAnalysisRequired()).isTrue();
    verify(sensorContext, never()).nextCache();
    verify(sensorContext, never()).previousCache();
  }

  @Test
  void should_write_to_cache() throws IOException {
    when(previousCache.contains(anyString())).thenReturn(false);

    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    strategy.writeAnalysisToCache(new CacheAnalysis(CPD_TOKENS, null), inputFile);

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
  void should_write_an_empty_archive_in_cache() throws IOException {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(previousCache.contains(anyString())).thenReturn(false);

    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    strategy.writeAnalysisToCache(CacheAnalysis.fromResponse(CPD_TOKENS, null), inputFile);
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_read_from_cache() throws IOException {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    var serializationResult = CpdSerializer.toBinary(new CpdData(CPD_TOKENS));
    when(previousCache.contains(cpdDataCacheKey)).thenReturn(true);
    when(previousCache.contains(cpdStringTableCacheKey)).thenReturn(true);
    when(previousCache.read(cpdDataCacheKey)).thenReturn(
      inputStream(serializationResult.getData())
    );
    when(previousCache.read(cpdStringTableCacheKey)).thenReturn(
      inputStream(serializationResult.getStringTable())
    );

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.READ_AND_WRITE);
    assertThat(strategy.isAnalysisRequired()).isFalse();

    verify(previousCache).read(cpdDataCacheKey);
    verify(nextCache).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache).read(cpdStringTableCacheKey);
    verify(nextCache).copyFromPrevious(cpdStringTableCacheKey);

    strategy.writeAnalysisToCache(new CacheAnalysis(CPD_TOKENS, null), inputFile);
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_handle_invalid_cpd_tokens_serialization() throws IOException {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);
    when(previousCache.contains(cpdDataCacheKey)).thenReturn(true);
    when(previousCache.contains(cpdStringTableCacheKey)).thenReturn(true);
    when(previousCache.read(cpdDataCacheKey)).thenReturn(inputStream("invalid-cpd-data"));
    when(previousCache.read(cpdStringTableCacheKey)).thenReturn(
      inputStream("invalid-cpd-stringTable")
    );

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(cpdDataCacheKey);
    verify(previousCache).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);
  }

  @Test
  void should_handle_invalid_ast_bytes_serialization() throws IOException {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    // Set up valid CPD cache data
    var serializationResult = CpdSerializer.toBinary(new CpdData(CPD_TOKENS));
    when(previousCache.contains(cpdDataCacheKey)).thenReturn(true);
    when(previousCache.contains(cpdStringTableCacheKey)).thenReturn(true);
    when(previousCache.read(cpdDataCacheKey)).thenReturn(
      inputStream(serializationResult.getData())
    );
    when(previousCache.read(cpdStringTableCacheKey)).thenReturn(
      inputStream(serializationResult.getStringTable())
    );

    // Set up invalid AST data
    when(previousCache.contains(astCacheKey)).thenReturn(true);
    when(previousCache.read(astCacheKey)).thenReturn(inputStream(new byte[] { 42 }));

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache).read(astCacheKey);
  }

  @Test
  void should_handle_different_version() throws IOException {
    var pluginVersion = "1.2.3";

    when(inputFile.status()).thenReturn(InputFile.Status.SAME);
    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    var serializationResult = CpdSerializer.toBinary(new CpdData(emptyList()));
    when(previousCache.read(cpdDataCacheKey)).thenReturn(
      inputStream(serializationResult.getData())
    );
    when(previousCache.read(cpdStringTableCacheKey)).thenReturn(
      inputStream(serializationResult.getStringTable())
    );

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, pluginVersion);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    var metadataCacheKey = CacheKey.forFile(inputFile, pluginVersion).forFileMetadata().toString();
    var cpdDataCacheKey = CacheKey.forFile(inputFile, pluginVersion)
      .forCpd()
      .withPrefix(CpdSerialization.DATA_PREFIX)
      .toString();
    var cpdStringTableCacheKey = CacheKey.forFile(inputFile, pluginVersion)
      .forCpd()
      .withPrefix(CpdSerialization.STRING_TABLE_PREFIX)
      .toString();

    verify(previousCache).contains(metadataCacheKey);
    verify(previousCache, never()).contains(cpdDataCacheKey);
    verify(previousCache, never()).contains(cpdStringTableCacheKey);

    verify(previousCache, never()).read(metadataCacheKey);
    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);

    verify(nextCache, never()).copyFromPrevious(metadataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);
  }

  @Test
  void should_check_file_status() throws IOException {
    when(inputFile.contents()).thenReturn("Changed");

    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);

    strategy.writeAnalysisToCache(new CacheAnalysis(CPD_TOKENS, null), inputFile);
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_check_analysis_status() throws IOException {
    when(inputFile.status()).thenReturn(InputFile.Status.SAME);

    when(sensorContext.canSkipUnchangedFiles()).thenReturn(false);

    var strategy = CacheStrategies.getStrategyFor(context, inputFile, PLUGIN_VERSION);
    assertThat(strategy.getName()).isEqualTo(CacheStrategy.WRITE_ONLY);
    assertThat(strategy.isAnalysisRequired()).isTrue();

    verify(previousCache, never()).read(cpdDataCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdDataCacheKey);
    verify(previousCache, never()).read(cpdStringTableCacheKey);
    verify(nextCache, never()).copyFromPrevious(cpdStringTableCacheKey);

    strategy.writeAnalysisToCache(new CacheAnalysis(CPD_TOKENS, null), inputFile);
    verify(nextCache).write(eq(cpdDataCacheKey), any(byte[].class));
    verify(nextCache).write(eq(cpdStringTableCacheKey), any(byte[].class));
  }

  @Test
  void should_log() {
    when(inputFile.toString()).thenReturn("test.js");
    assertThat(
      CacheStrategies.getLogMessage(
        readAndWrite(CacheAnalysis.fromCache(List.of(), null), serialization),
        inputFile,
        "this is a test"
      )
    ).isEqualTo("Cache strategy set to 'READ_AND_WRITE' for file 'test.js' as this is a test");
    assertThat(CacheStrategies.getLogMessage(writeOnly(serialization), inputFile, null)).isEqualTo(
      "Cache strategy set to 'WRITE_ONLY' for file 'test.js'"
    );
  }

  @Test
  void should_check_file_hash() throws Exception {
    when(sensorContext.canSkipUnchangedFiles()).thenReturn(true);

    var inputFile = TestInputFileBuilder.create("dir", "file.ts")
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

    reset(previousCache);
    when(previousCache.contains(metadataKey)).thenReturn(true);
    when(previousCache.read(metadataKey)).thenReturn(
      inputStream(new Gson().toJson(FileMetadata.from(inputFile)))
    );
    CacheStrategies.getStrategyFor(context, inputFile, pluginVersion);

    verify(previousCache).contains(metadataKey);
    verify(previousCache).read(metadataKey);
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
