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

import static java.util.Optional.ofNullable;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.eclipsesource.json.Json;
import com.eclipsesource.json.JsonValue;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.BuildRunner;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.config.Configuration;
import com.sonar.orchestrator.http.HttpCall;
import com.sonar.orchestrator.http.HttpMethod;
import com.sonar.orchestrator.http.HttpResponse;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.MavenLocation;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.State;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.options.OptionsBuilder;

@State(Scope.Benchmark)
public class SonarJsPerfBenchmark {

  static final String SCANNER_VERSION = "5.0.1.3006";

  @Param("")
  String token;

  @Benchmark
  @BenchmarkMode(Mode.AverageTime)
  @OutputTimeUnit(TimeUnit.SECONDS)
  public void vuetify() throws Exception {
    var result = runScan(token, "vuetify");
    assertTrue(result.getLogs().contains("INFO: 1585/1585 source files have been analyzed"));
  }

  public static void main(String[] args) throws Exception {
    var orchestrator = orchestrator();
    try {
      orchestrator.start();
      var token = generateDefaultAdminToken(orchestrator);

      var opt = new OptionsBuilder()
        .include(SonarJsPerfBenchmark.class.getSimpleName())
        .param("token", token)
        .forks(1)
        .build();

      new Runner(opt).run();
    } finally {
      orchestrator.stop();
    }
  }

  private static Orchestrator orchestrator() {
    var pluginLocation = MavenLocation.of(
      "org.sonarsource.javascript",
      "sonar-javascript-plugin",
      "DEV"
    );
    return OrchestratorExtension
      .builderEnv()
      .setSonarVersion("LATEST_RELEASE")
      .setOrchestratorProperty("orchestrator.container.port", "9000")
      .useDefaultAdminCredentialsForBuilds(true)
      .addPlugin(pluginLocation)
      .build();
  }

  private static BuildResult runScan(String token, String projectKey) {
    SonarScanner build = SonarScanner
      .create(Path.of("../sources/jsts/projects/", projectKey).toFile())
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setSourceDirs("./")
      .setSourceEncoding("utf-8")
      .setScannerVersion(SCANNER_VERSION)
      .setProperty("sonar.javascript.node.maxspace", "4096")
      .setProperty("sonar.javascript.maxFileSize", "4000")
      .setProperty("sonar.cpd.exclusions", "**/*")
      .setProperty("sonar.internal.analysis.failFast", "true")
      .setProperty("sonar.token", token);

    return new BuildRunner(Configuration.createEnv()).run(null, build);
  }

  private static String generateDefaultAdminToken(Orchestrator orchestrator) {
    HttpCall httpCall = orchestrator
      .getServer()
      .newHttpCall("api/user_tokens/generate")
      .setParam("name", UUID.randomUUID().toString())
      .setMethod(HttpMethod.POST)
      .setAdminCredentials();
    HttpResponse response = httpCall.execute();
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
