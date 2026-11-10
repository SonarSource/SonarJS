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
package org.sonar.javascript.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.google.gson.Gson;
import com.sonarsource.scanner.engine.sensor.test.fixtures.SensorContextTester;
import com.sonarsource.scanner.engine.sensor.test.fixtures.TestInputFileBuilder;
import com.sonarsource.scanner.engine.sensor.test.fixtures.TestSonarRuntime;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.a3s.A3SContextCollector;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;
import org.sonar.css.CssRules;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.analysis.AnalysisConsumers;
import org.sonar.plugins.javascript.analysis.AnalysisProcessor;
import org.sonar.plugins.javascript.analysis.DefaultFilesystemCacheContext;
import org.sonar.plugins.javascript.analysis.FilesystemCacheContext;
import org.sonar.plugins.javascript.analysis.JsTsChecks;
import org.sonar.plugins.javascript.analysis.WebSensor;
import org.sonar.plugins.javascript.analysis.WebSensorModuleConfiguration;
import org.sonar.plugins.javascript.api.Language;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.BundleImpl;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;
import org.sonar.plugins.javascript.bridge.NodeDeprecationWarning;
import org.sonar.plugins.javascript.bridge.PluginInfo;
import org.sonar.plugins.javascript.bridge.RulesBundles;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;
import org.sonar.scanner.plugin.api.impl.rule.ActiveRulesBuilder;
import org.sonar.scanner.plugin.api.impl.rule.NewActiveRule;
import org.sonar.scanner.plugin.api.impl.sensor.issue.DefaultNoSonarFilter;
import org.sonar.scanner.plugin.api.impl.utils.DefaultTempFolder;

/** Real Java/Node sensor integration; deliberately excludes scanner bootstrap and backend upload. */
@EnabledIfSystemProperty(named = "sonarjs.contextCacheBenchmark", matches = "true")
class VuetifyContextCacheTest {

  private static final Gson GSON = new Gson();
  private static final String CHANGED = "packages/vuetify/src/util/anchor.ts";
  private static final String UNCHANGED = "packages/vuetify/src/util/helpers.ts";
  private final Path output = Path.of(
    System.getProperty("sonarjs.contextCacheOutput", "target/context-cache")
  ).toAbsolutePath();
  private final Path project = output.resolve("project");
  private final List<Measurement> measurements = new ArrayList<>();
  private final Map<String, String> inputs = new TreeMap<>();
  private final Map<String, String> languages = new TreeMap<>();
  private final List<String> warnings = new ArrayList<>();

  @RegisterExtension
  final LogTesterJUnit5 logs = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @Test
  void compare_one_file_pr_with_and_without_context() throws Exception {
    Files.createDirectories(output);
    assertThat(project).doesNotExist(); // Never silently benchmark leftover sources from an older run.
    copyProject(
      Path.of(System.getProperty("sonarjs.contextCacheProject", "../sources/projects/vuetify"))
    );
    PluginInfo.setVersion("context-cache-benchmark");
    var baseline = new DiskCache(output.resolve("baseline-cache"), null, false);
    var main = run("master", false, true, baseline, null);
    assertThat(main.collector.published).isTrue();
    assertThat(main.hits).isZero();

    // Change an existing file without changing imports, exports, or the project structure.
    var original = inputs.get(CHANGED);
    assertThat(original).isNotNull();
    inputs.put(CHANGED, original + "\n; // context-cache benchmark: S1116\n");
    Files.writeString(project.resolve(CHANGED), inputs.get(CHANGED));
    Files.writeString(output.resolve("expected-inputs.json"), GSON.toJson(inputs));
    var baselineDigest = baseline.digest();

    // One warm-up pair, followed by alternating order to reduce JVM/OS cache order bias.
    int repetitions = Integer.getInteger("sonarjs.contextCacheRepetitions", 3);
    assertThat(repetitions).isPositive();
    Run lastContext = null;
    for (int pair = 0; pair <= repetitions; pair++) {
      Run without;
      Run with;
      String prefix = pair == 0 ? "warmup" : "pair-" + pair;
      if (pair % 2 == 0) {
        without = run(prefix + "-without", true, false, prCache(baseline), null);
        with = run(prefix + "-with", true, true, prCache(baseline), null);
      } else {
        with = run(prefix + "-with", true, true, prCache(baseline), null);
        without = run(prefix + "-without", true, false, prCache(baseline), null);
      }
      assertThat(without.hits).isEqualTo(inputs.size() - 1);
      assertThat(with.hits).isEqualTo(without.hits);
      assertThat(with.issues).isEqualTo(without.issues);
      assertThat(with.collector.published).isTrue();
      assertThat(without.collector.published).isFalse();
      assertThat(baseline.digest()).isEqualTo(baselineDigest);
      lastContext = with;
    }

    DiskCache latestFullCache = null;
    if (Boolean.getBoolean("sonarjs.contextCacheFullComparisons")) {
      for (int iteration = 1; iteration <= repetitions; iteration++) {
        latestFullCache = new DiskCache(output.resolve("full-cache-" + iteration), null, false);
        var full = run("full-" + iteration, false, true, latestFullCache, null);
        assertThat(full.collector.published).isTrue();
        assertThat(full.hits).isZero();
      }
      var allCached = run("all-cached-with", true, true, prCache(latestFullCache), null);
      assertThat(allCached.hits).isEqualTo(inputs.size());
      assertThat(allCached.issues).isEmpty();
      assertThat(allCached.collector.published).isTrue();
    }

    // Replay the edited file AND a skipped file with the actual source tree unavailable.
    // Keep every input in the fixture for path mapping; only these two are requested for replay.
    var replayInputs = new TreeMap<String, String>();
    replayInputs.put(CHANGED, inputs.get(CHANGED));
    replayInputs.put(UNCHANGED, inputs.get(UNCHANGED));
    var expected = new ArrayList<>(lastContext.issues);
    expected.addAll(
      main.issues
        .stream()
        .filter(issue -> issue.startsWith(UNCHANGED + "|"))
        .toList()
    );
    expected.sort(String::compareTo);
    Files.move(project, output.resolve("hidden-project"));
    Files.createDirectory(project);
    var allInputs = new TreeMap<>(inputs);
    inputs.clear();
    inputs.putAll(replayInputs);
    try {
      var replay = run("replay", false, false, prCache(baseline), lastContext.collector);
      assertThat(replay.issues).isEqualTo(expected);
    } finally {
      inputs.clear();
      inputs.putAll(allInputs);
      // Replay deploys its runtime under .scannerwork. Preserve that output before restoring sources.
      Files.move(project, output.resolve("replay-project"));
      Files.move(output.resolve("hidden-project"), project);
    }
    assertThat(warnings).isEmpty();
    var verification = new ProcessBuilder(
      System.getProperty("sonarjs.localNodeExecutable"),
      "verify-context-cache.mjs",
      output.toString()
    )
      .redirectErrorStream(true)
      .redirectOutput(output.resolve("completeness.log").toFile())
      .start();
    assertThat(verification.waitFor())
      .as("Node context completeness verification: %s", output.resolve("completeness.log"))
      .isZero();
  }

  private DiskCache prCache(DiskCache baseline) throws IOException {
    // Scanner PR writers are no-ops. Every PR reads the SAME immutable master generation.
    return new DiskCache(output.resolve("unused-pr-cache"), baseline, true);
  }

  private Run run(String name, boolean pr, boolean collect, DiskCache cache, Collector restored)
    throws Exception {
    var directory = Files.createDirectories(output.resolve(name));
    var context = SensorContextTester.create(project);
    var scannerWork = Files.createDirectories(project.resolve(".scannerwork"));
    context.fileSystem().setWorkDir(scannerWork);
    context.setRuntime(
      TestSonarRuntime.forSonarQube(
        Version.create(9, 6),
        SonarQubeSide.SCANNER,
        SonarEdition.ENTERPRISE
      )
    );
    context.setCanSkipUnchangedFiles(pr);
    context.setCacheEnabled(true);
    context.setPreviousCache(cache.previous == null ? cache : cache.previous);
    context.setNextCache(cache);
    var nodeExecutable = System.getProperty("sonarjs.localNodeExecutable");
    assertThat(nodeExecutable)
      .as("Set sonarjs.localNodeExecutable to the absolute path of Node.js")
      .isNotNull();
    assertThat(Path.of(nodeExecutable)).isRegularFile();
    context.settings().setProperty("sonar.nodejs.executable", nodeExecutable);
    context.settings().setProperty("sonar.javascript.node.maxspace", "4096");
    context.settings().setProperty("sonar.javascript.maxFileSize", "4000");
    context
      .settings()
      .setProperty("sonar.internal.analysis.skipNodeModuleLookupOutsideBaseDir", "true");
    context.settings().setProperty("sonar.internal.analysis.failFast", "true");
    for (var entry : inputs.entrySet()) {
      context.fileSystem().add(
        new TestInputFileBuilder("vuetify", entry.getKey())
          .setModuleBaseDir(project)
          .setLanguage(languages.get(entry.getKey()))
          .setType(InputFile.Type.MAIN)
          .setCharset(StandardCharsets.UTF_8)
          .setStatus(
            pr && (name.equals("all-cached-with") || !entry.getKey().equals(CHANGED))
              ? InputFile.Status.SAME
              : InputFile.Status.CHANGED
          )
          .setContents(entry.getValue())
          .build()
      );
    }
    if (restored != null) {
      context
        .settings()
        .setProperty(FilesystemCacheContext.RESTORED_CONTEXT_METADATA_PROPERTY, restored.metadata);
      context
        .settings()
        .setProperty(
          "sonar.javascript.internal.filesystemCacheArchivePath",
          restored.archive.toString()
        );
      context
        .settings()
        .setProperty(
          "sonar.javascript.internal.analysisMetadataPath",
          restored.selection.toString()
        );
    }
    var rules = new ActiveRulesBuilder();
    for (var language : Language.values()) {
      var keys = new java.util.HashSet<>(
        CheckList.getDefaultQualityProfileRuleKeys("Sonar way", language)
      );
      keys.add("S1116");
      assertThat(keys.size()).isGreaterThan(100);
      for (var key : keys)
        rules.addRule(
          new NewActiveRule.Builder()
            .setRuleKey(
              RuleKey.of(
                language == Language.JAVASCRIPT
                  ? CheckList.JS_REPOSITORY_KEY
                  : CheckList.TS_REPOSITORY_KEY,
                key
              )
            )
            .build()
        );
    }
    var checks = new JsTsChecks(new CheckFactory(rules.build()));
    var css = new CssRules(new CheckFactory(new ActiveRulesBuilder().build()));
    var warningCollector = new AnalysisWarningsWrapper(warnings::add);
    var bridge = new BridgeServerImpl(
      new NodeCommandBuilderImpl(new ProcessWrapperImpl()),
      new BundleImpl(),
      new RulesBundles(),
      new NodeDeprecationWarning(warningCollector),
      new DefaultTempFolder(
        Files.createDirectories(scannerWork.resolve(".sonartmp")).toFile(),
        true
      ),
      mock(EmbeddedNode.class)
    );
    var collector = new Collector(directory, collect);
    // Per-line measure storage is outside this benchmark's scope; retain actual sensor results.
    var processor = new AnalysisProcessor(
      new DefaultNoSonarFilter(),
      file ->
        new FileLinesContext() {
          public void setIntValue(String metric, int line, int value) {}

          public void setStringValue(String metric, int line, String value) {}

          public void save() {}
        },
      css
    );
    var sensor = new WebSensor(
      checks,
      bridge,
      processor,
      warningCollector,
      new AnalysisConsumers(),
      css,
      new DefaultFilesystemCacheContext(collector),
      new WebSensorModuleConfiguration()
    );
    logs.clear();
    long cacheBytesBefore = (cache.previous == null ? cache : cache.previous).readBytes;
    System.gc(); // Discard the previous sensor fixture before measuring the next independent run.
    var marker = Map.of("phase", name, "pid", ProcessHandle.current().pid());
    Files.writeString(output.resolve("phase.json"), GSON.toJson(marker));
    System.out.println("CONTEXT_CACHE_PHASE " + name);
    long start = System.nanoTime();
    long elapsed;
    try {
      sensor.execute(context);
      elapsed = System.nanoTime() - start;
    } finally {
      Files.deleteIfExists(output.resolve("phase.json"));
      bridge.clean();
      Files.writeString(directory.resolve("sensor.log"), String.join("\n", logs.logs()));
    }
    var hitLine = logs
      .logs(Level.INFO)
      .stream()
      .filter(line -> line.startsWith("Hit the cache for "))
      .findFirst()
      .orElseThrow();
    assertThat(context.allAnalysisErrors()).isEmpty();
    int hits = Integer.parseInt(hitLine.split(" ")[4]);
    var issues = context
      .allIssues()
      .stream()
      .map(issue -> {
        var location = issue.primaryLocation();
        return (
          ((InputFile) location.inputComponent()).relativePath() +
          "|" +
          issue.ruleKey() +
          "|" +
          location.textRange() +
          "|" +
          location.message()
        );
      })
      .sorted()
      .toList();
    measurements.add(
      new Measurement(
        name,
        elapsed / 1_000_000.0,
        inputs.size(),
        hits,
        issues.size(),
        collector.bytes,
        (cache.previous == null ? cache : cache.previous).readBytes - cacheBytesBefore
      )
    );
    Files.writeString(output.resolve("measurements.json"), GSON.toJson(measurements));
    if (pr && !name.equals("all-cached-with")) {
      assertThat(hits)
        .as("Unchanged-file cache hits in %s; see sensor.log", name)
        .isEqualTo(inputs.size() - 1);
      assertThat(issues).allMatch(issue -> issue.startsWith(CHANGED + "|"));
      assertThat(issues).anyMatch(issue -> issue.contains("S1116"));
    }
    return new Run(collector, hits, issues);
  }

  private void copyProject(Path source) throws IOException {
    assertThat(source.resolve(CHANGED)).isRegularFile();
    try (var files = Files.walk(source)) {
      for (var file : files.toList()) {
        var relative = source.relativize(file);
        if (relative.toString().isEmpty()) continue;
        if (
          relative.toString().replace('\\', '/').matches(".*(^|/)(node_modules|\\.[^/]+)(/.*)?")
        ) continue;
        if (Files.isDirectory(file)) Files.createDirectories(project.resolve(relative));
        else {
          Files.createDirectories(project.resolve(relative).getParent());
          Files.copy(file, project.resolve(relative));
          var name = relative.toString().replace('\\', '/');
          if (name.endsWith(".d.ts")) continue;
          var extension = name.substring(name.lastIndexOf('.') + 1);
          String language = switch (extension) {
            case "js", "jsx", "mjs", "cjs", "vue" -> "js";
            case "ts", "tsx" -> "ts";
            default -> null;
          };
          if (language != null) {
            inputs.put(name, Files.readString(file));
            languages.put(name, language);
          }
        }
      }
    }
    assertThat(inputs.size()).isGreaterThan(1000);
  }

  private record Run(Collector collector, int hits, List<String> issues) {}

  private record Measurement(
    String phase,
    double sensorMs,
    int files,
    int hits,
    int issues,
    long contextBytes,
    long cacheReadBytes
  ) {}

  private record CapturedItem(String id, Path path) implements A3SContextCollector.Item {}

  private static class Collector implements A3SContextCollector {

    final Path directory;
    final boolean enabled;
    boolean published;
    String metadata;
    Path archive;
    Path selection;
    long bytes;

    Collector(Path directory, boolean enabled) {
      this.directory = directory;
      this.enabled = enabled;
    }

    public boolean isEnabled() {
      return enabled;
    }

    public A3SContextCollector.Item newFileItem(String id, Path path) {
      return new CapturedItem(id, path);
    }

    public void collect(String kind, String metadata, Collection<A3SContextCollector.Item> items) {
      assertThat(kind).isEqualTo(FilesystemCacheContext.CONTEXT_KIND);
      assertThat(items).hasSize(2);
      this.metadata = metadata;
      try {
        for (var item : items) {
          var target = directory.resolve(item.id() + ".pb.gz");
          Files.copy(((CapturedItem) item).path(), target, StandardCopyOption.REPLACE_EXISTING);
          bytes += Files.size(target);
          if (item.id().equals(FilesystemCacheContext.ARCHIVE_ITEM_ID)) archive = target;
          if (item.id().equals(FilesystemCacheContext.ANALYSIS_METADATA_ITEM_ID)) selection =
            target;
        }
        assertThat(archive).isNotEmptyFile();
        assertThat(selection).isNotEmptyFile();
        Files.writeString(directory.resolve("metadata.json"), metadata);
        published = true;
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }
  }

  /** File-backed API adapter: no baseline byte arrays retained in the JVM and no PR writes. */
  private static class DiskCache implements ReadCache, WriteCache {

    final Path directory;
    final DiskCache previous;
    final boolean noOpWrites;
    long readBytes;

    DiskCache(Path directory, DiskCache previous, boolean noOpWrites) throws IOException {
      this.directory = Files.createDirectories(directory);
      this.previous = previous;
      this.noOpWrites = noOpWrites;
    }

    private Path file(String key) {
      try {
        return directory.resolve(
          HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8))
          )
        );
      } catch (java.security.NoSuchAlgorithmException e) {
        throw new IllegalStateException(e);
      }
    }

    public boolean contains(String key) {
      return Files.isRegularFile(file(key));
    }

    public InputStream read(String key) {
      try {
        readBytes += Files.size(file(key));
        return Files.newInputStream(file(key));
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    public void write(String key, InputStream input) {
      if (noOpWrites) return;
      assertThat(contains(key)).isFalse();
      try {
        Files.copy(input, file(key));
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    public void write(String key, byte[] value) {
      if (noOpWrites) return;
      assertThat(contains(key)).isFalse();
      try {
        Files.write(file(key), value);
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    public void copyFromPrevious(String key) {
      if (noOpWrites) return;
      try (var input = previous.read(key)) {
        write(key, input);
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    Map<String, String> digest() throws Exception {
      var result = new TreeMap<String, String>();
      try (var files = Files.list(directory)) {
        for (var path : files.toList())
          result.put(
            path.getFileName().toString(),
            HexFormat.of().formatHex(
              MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path))
            )
          );
      }
      return result;
    }
  }
}
