/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sonarsource.scanner.engine.sensor.test.fixtures.TestSonarRuntime;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.PluginInfo;

class ContextSnapshotCacheTest {

  @TempDir
  Path temporary;

  final SensorContext context = mock(SensorContext.class);
  final ReadCache previous = mock(ReadCache.class);
  final WriteCache next = mock(WriteCache.class);
  final Map<String, byte[]> generation = new HashMap<>();

  @BeforeEach
  void setup() throws Exception {
    PluginInfo.setVersion("test-version");
    when(context.runtime()).thenReturn(
      TestSonarRuntime.forSonarQube(
        Version.create(9, 6),
        SonarQubeSide.SCANNER,
        SonarEdition.ENTERPRISE
      )
    );
    when(context.isCacheEnabled()).thenReturn(true);
    when(context.previousCache()).thenReturn(previous);
    when(context.nextCache()).thenReturn(next);
    when(previous.contains(anyString())).thenAnswer(call ->
      generation.containsKey(call.getArgument(0))
    );
    when(previous.read(anyString())).thenAnswer(call ->
      new ByteArrayInputStream(generation.get(call.getArgument(0)))
    );
    doAnswer(call -> {
      generation.put(call.getArgument(0), ((InputStream) call.getArgument(1)).readAllBytes());
      return null;
    })
      .when(next)
      .write(anyString(), any(InputStream.class));
  }

  ContextSnapshotCache.Snapshot snapshot() throws Exception {
    Path archive = temporary.resolve("filesystem.pb.gz");
    Path metadata = temporary.resolve("programs.pb.gz");
    Path manifest = temporary.resolve("manifest.json");
    Files.writeString(archive, "filesystem observations");
    Files.writeString(metadata, "program selections");
    Files.writeString(manifest, "compatibility manifest");
    return new ContextSnapshotCache.Snapshot(
      archive,
      metadata,
      manifest,
      "{\"configuration\":{\"baseDir\":\"/project\"}}"
    );
  }

  @Test
  void transports_one_complete_generation_using_only_the_cache_api() throws Exception {
    var original = snapshot();
    ContextSnapshotCache.write(context, original);
    var restored = ContextSnapshotCache.restore(
      context,
      temporary.resolve("next-checkout")
    ).orElseThrow();
    assertThat(Files.readString(restored.archive())).isEqualTo("filesystem observations");
    assertThat(Files.readString(restored.analysisMetadata())).isEqualTo("program selections");
    assertThat(Files.readString(restored.manifest())).isEqualTo("compatibility manifest");
    assertThat(restored.contextMetadata()).isEqualTo(original.contextMetadata());
    verify(next, times(1)).write(anyString(), any(InputStream.class));
    verify(next, never()).copyFromPrevious(anyString());
  }

  @Test
  void honors_cache_disablement_and_analyzer_version() throws Exception {
    var original = snapshot();
    when(context.isCacheEnabled()).thenReturn(false);
    ContextSnapshotCache.write(context, original);
    assertThat(ContextSnapshotCache.restore(context, temporary.resolve("disabled"))).isEmpty();
    verifyNoInteractions(previous, next);
    when(context.isCacheEnabled()).thenReturn(true);
    ContextSnapshotCache.write(context, original);
    PluginInfo.setVersion("new-version");
    assertThat(ContextSnapshotCache.restore(context, temporary.resolve("upgrade"))).isEmpty();
  }

  @Test
  void rejects_missing_or_truncated_generations() throws Exception {
    assertThat(ContextSnapshotCache.restore(context, temporary.resolve("missing"))).isEmpty();
    ContextSnapshotCache.write(context, snapshot());
    byte[] bytes = generation.get(ContextSnapshotCache.key());
    generation.put(ContextSnapshotCache.key(), java.util.Arrays.copyOf(bytes, bytes.length - 1));
    assertThat(ContextSnapshotCache.restore(context, temporary.resolve("truncated"))).isEmpty();
  }

  @Test
  void respects_a_noop_writer_without_mutating_the_previous_generation() throws Exception {
    var original = snapshot();
    ContextSnapshotCache.write(context, original);
    byte[] baseline = generation.get(ContextSnapshotCache.key()).clone();
    reset(next);
    Files.writeString(original.archive(), "PR observations");
    ContextSnapshotCache.write(context, original);
    assertThat(generation.get(ContextSnapshotCache.key())).isEqualTo(baseline);
    assertThat(
      Files.readString(
        ContextSnapshotCache.restore(context, temporary.resolve("pr")).orElseThrow().archive()
      )
    ).isEqualTo("filesystem observations");
  }
}
