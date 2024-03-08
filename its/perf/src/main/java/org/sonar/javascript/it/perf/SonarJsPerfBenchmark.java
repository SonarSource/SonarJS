/*
 * Copyright (c) 2014, Oracle America, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  * Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 *  * Neither the name of Oracle nor the names of its contributors may be used
 *    to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */
package org.sonar.javascript.it.perf;

import static java.nio.file.StandardOpenOption.APPEND;
import static java.nio.file.StandardOpenOption.CREATE;
import static java.util.Optional.ofNullable;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.eclipsesource.json.Json;
import com.eclipsesource.json.JsonValue;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.BuildRunner;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.config.Configuration;
import com.sonar.orchestrator.http.HttpMethod;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.Location;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.jetbrains.annotations.NotNull;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Measurement;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.State;
import org.openjdk.jmh.annotations.Warmup;
import org.openjdk.jmh.results.RunResult;
import org.openjdk.jmh.results.format.ResultFormatFactory;
import org.openjdk.jmh.results.format.ResultFormatType;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.OptionsBuilder;

@State(Scope.Benchmark)
public class SonarJsPerfBenchmark {

  static final String SCANNER_VERSION = "5.0.1.3006";

  static final double MARGIN_PERCENT = 2;

  private static final int DEFAULT_MAXSPACE = 4096;

  @Param("")
  String token;

  @Param("")
  String pluginVersion;

  @Benchmark
  @BenchmarkMode(Mode.AverageTime)
  @Warmup(iterations = 1)
  @Measurement(iterations = 1)
  @OutputTimeUnit(TimeUnit.SECONDS)
  public void vuetify() {
    var result = runScan(token, "vuetify", DEFAULT_MAXSPACE);
    assertTrue(result.getLogs().contains("INFO: 509/509 source files have been analyzed"));
  }

  @Benchmark
  @BenchmarkMode(Mode.AverageTime)
  @Warmup(iterations = 1)
  @Measurement(iterations = 1)
  @OutputTimeUnit(TimeUnit.SECONDS)
  public void vscode() {
    var result = runScan(token, "vscode", 6 * 1024);
    assertTrue(result.getLogs().contains("INFO: 4721/4721 source files have been analyzed"));
  }

  public static void main(String[] args) throws Exception {
    var baseline = runBenchmark(
      MavenLocation.create(
        "org.sonarsource.javascript",
        "sonar-javascript-plugin",
        "LATEST_RELEASE",
        "multi"
      )
    );
    var candidate = runBenchmark(
      FileLocation.byWildcardMavenFilename(
        new File("../../sonar-plugin/sonar-javascript-plugin/target"),
        "sonar-javascript-plugin-*-multi.jar"
      )
    );
    println("\nBaseline\n==================================");
    print(baseline);
    println("\nCandidate\n==================================");
    print(candidate);
    compare(baseline, candidate);
  }

  private static void print(Collection<RunResult> result) throws IOException {
    try (var out = Files.newOutputStream(Path.of("target", "perf.txt"), APPEND, CREATE)) {
      var writer = new PrintStream(out);
      ResultFormatFactory.getInstance(ResultFormatType.TEXT, System.out).writeOut(result);
      ResultFormatFactory.getInstance(ResultFormatType.TEXT, writer).writeOut(result);
    }
  }

  private static void compare(Collection<RunResult> baseline, Collection<RunResult> candidate) {
    var baselineBenchs = mapByLabel(baseline);
    var candidateBenchs = mapByLabel(candidate);
    var b = new AtomicBoolean();
    baselineBenchs.forEach((label, baselineScore) -> {
      var candidateScore = candidateBenchs.get(label);
      println("====== " + label);
      println("Baseline: " + baselineScore);
      println("Candidate: " + candidateScore);
      var delta = Math.abs(baselineScore - candidateScore);
      var deltaPercent = delta / baselineScore * 100;
      printf("Delta: %.3f (%.3f %%)%n", delta, deltaPercent);
      if (deltaPercent > MARGIN_PERCENT) {
        println("Performance degradation is greater than " + MARGIN_PERCENT + "%");
        b.set(true);
      }
    });
    // if any of the benchmarks failed, fail
    if (b.get()) {
      throw new IllegalStateException(
        "Performance degradation is greater than " + MARGIN_PERCENT + "%"
      );
    }
  }

  static void println(String s) {
    printf("%s%n", s);
  }

  static void printf(String s, Object... args) {
    System.out.printf(s, args);
  }

  @NotNull
  private static Map<String, Double> mapByLabel(Collection<RunResult> baseline) {
    return baseline
      .stream()
      .collect(
        Collectors.toMap(r -> r.getPrimaryResult().getLabel(), r -> r.getPrimaryResult().getScore())
      );
  }

  private static Collection<RunResult> runBenchmark(Location pluginLocation)
    throws RunnerException {
    var orchestrator = orchestrator(pluginLocation);
    try {
      orchestrator.start();
      var token = generateDefaultAdminToken(orchestrator);

      String resolvedJsPluginVersion = getJsPluginVersion(orchestrator).orElseThrow();
      println("Resolved JS plugin version " + resolvedJsPluginVersion);
      var opt = new OptionsBuilder()
        .include(SonarJsPerfBenchmark.class.getSimpleName())
        .param("token", token)
        .param("pluginVersion", resolvedJsPluginVersion)
        .forks(1)
        .build();

      return new Runner(opt).run();
    } finally {
      orchestrator.stop();
    }
  }

  private static Optional<String> getJsPluginVersion(Orchestrator orchestrator) {
    var installed = orchestrator
      .getServer()
      .newHttpCall("api/plugins/installed")
      .setAdminCredentials()
      .execute()
      .getBodyAsString();
    var plugins = new Gson().fromJson(installed, JsonObject.class).get("plugins").getAsJsonArray();
    return StreamSupport
      .stream(plugins.spliterator(), false)
      .map(JsonElement::getAsJsonObject)
      .filter(e -> "javascript".equals(e.get("key").getAsString()))
      .map(e -> e.get("version").getAsString())
      .findFirst();
  }

  private static Orchestrator orchestrator(Location pluginLocation) {
    return OrchestratorExtension
      .builderEnv()
      .setSonarVersion("LATEST_RELEASE")
      .setOrchestratorProperty("orchestrator.container.port", "9000")
      .useDefaultAdminCredentialsForBuilds(true)
      .addPlugin(pluginLocation)
      .build();
  }

  private static BuildResult runScan(String token, String projectKey, int maxspace) {
    var build = SonarScanner
      .create(Path.of("../sources/jsts/projects/", projectKey).toFile())
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setSourceDirs("./")
      .setSourceEncoding("utf-8")
      .setScannerVersion(SCANNER_VERSION)
      .setProperty("sonar.javascript.node.maxspace", Integer.toString(maxspace))
      .setProperty("sonar.javascript.maxFileSize", "4000")
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setProperty("sonar.internal.analysis.failFast", "true")
      .setProperty("sonar.inclusions", "**/*.js,**/*.ts,**/.vue")
      .setProperty("sonar.token", token);

    return new BuildRunner(Configuration.createEnv()).run(null, build);
  }

  private static String generateDefaultAdminToken(Orchestrator orchestrator) {
    var httpCall = orchestrator
      .getServer()
      .newHttpCall("api/user_tokens/generate")
      .setParam("name", UUID.randomUUID().toString())
      .setMethod(HttpMethod.POST)
      .setAdminCredentials();
    var response = httpCall.execute();
    if (response.isSuccessful()) {
      return ofNullable(Json.parse(response.getBodyAsString()).asObject().get("token"))
        .map(JsonValue::asString)
        .orElseThrow(() ->
          new IllegalStateException(
            "Could not extract admin token from response: " + response.getBodyAsString()
          )
        );
    } else {
      throw new IllegalStateException(
        "Could not get token for admin: " + response.getBodyAsString()
      );
    }
  }
}
