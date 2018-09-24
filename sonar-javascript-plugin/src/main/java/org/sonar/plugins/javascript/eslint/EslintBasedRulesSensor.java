/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import com.google.gson.JsonSyntaxException;
import java.io.IOException;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.EslintBasedCheck;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.JavaScriptLanguage;

import static org.sonar.plugins.javascript.eslint.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.eslint.NetUtils.waitServerToStart;

public class EslintBasedRulesSensor implements Sensor {

  private static final Logger LOG = Loggers.get(EslintBasedRulesSensor.class);
  private static final Gson GSON = new Gson();

  private final ExternalProcessStreamConsumer externalProcessStreamConsumer = new ExternalProcessStreamConsumer();
  private final String nodeExecutable;
  private final String startServerScript;
  private final OkHttpClient client;
  private final int timeoutSec;

  private final String[] rules;
  private final JavaScriptChecks checks;

  private int port;
  private Process process = null;

  EslintBasedRulesSensor(CheckFactory checkFactory, String nodeExecutable, String startServerScript, int timeoutSec) {
    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks());

    this.rules = this.checks.eslintBasedChecks().stream()
      .map(EslintBasedCheck::eslintKey)
      .toArray(String[]::new);

    this.startServerScript = startServerScript;
    this.nodeExecutable = nodeExecutable;
    this.timeoutSec = timeoutSec;

    this.client = new OkHttpClient.Builder()
      .readTimeout(this.timeoutSec, TimeUnit.SECONDS)
      .build();
  }

  @Override
  public void execute(SensorContext context) {
    if (rules.length == 0) {
      LOG.info("Skipping execution of eslint-based rules because none of them are activated");
      return;
    }

    startEslintBridgeServerProcess();
    if (process == null) {
      return;
    }

    try {
      for (InputFile inputFile : getInputFiles(context)) {
        analyze(inputFile, context);
      }
    } finally {
      clean();
    }
  }

  private void analyze(InputFile file, SensorContext context) {
    AnalysisRequest analysisRequest = new AnalysisRequest(file, rules);

    Request request = new Request.Builder()
      .url("http://localhost:" + port + "/analyze")
      .post(RequestBody.create(MediaType.get("application/json"), GSON.toJson(analysisRequest)))
      .build();

    try {
      Response response = client.newCall(request).execute();
      // in this case response.body() is never null (according to docs)
      String result = response.body().string();
      AnalysisResponseIssue[] issues = toIssues(result);
      for (AnalysisResponseIssue issue : issues) {
        saveIssue(file, context, issue);
      }
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file.uri(), e);
    }
  }

  private void startEslintBridgeServerProcess() {
    port = findOpenPort();
    ProcessBuilder processBuilder = new ProcessBuilder(nodeExecutable, startServerScript, String.valueOf(port));
    try {
      LOG.debug("Starting node process to start eslint-bridge server at port " + port);
      process = processBuilder.start();
      setProcessStreamConsumers();

      if (!waitServerToStart("localhost", port, timeoutSec * 1000)) {
        LOG.error("Timeout error: failed to start server");
        clean();
        return;
      }

      LOG.debug("Server is started");

    } catch (IOException e) {
      String command = String.join(" ", processBuilder.command());
      LOG.error("Failed to start eslint-bridge server process: " + command, e);
    }
  }

  private void setProcessStreamConsumers() {
    externalProcessStreamConsumer.consumeStream(process.getErrorStream(), LOG::error);

    externalProcessStreamConsumer.consumeStream(process.getInputStream(), message -> {
      if (message.startsWith("DEBUG")) {
        LOG.debug(message.substring(5).trim());
      } else {
        LOG.info(message);
      }
    });
  }

  private void clean() {
    if (process != null) {
      process.destroy();
      externalProcessStreamConsumer.shutdownNow();
      process = null;
    }
  }

  private static AnalysisResponseIssue[] toIssues(String result) {
    try {
      return GSON.fromJson(result, AnalysisResponseIssue[].class);
    } catch (JsonSyntaxException e) {
      LOG.error("Failed to parse: \n-----\n" + result + "\n-----\n");
      return new AnalysisResponseIssue[0];
    }
  }

  private void saveIssue(InputFile file, SensorContext context, AnalysisResponseIssue issue) {
    NewIssue newIssue = context.newIssue();
    NewIssueLocation location = newIssue.newLocation()
      .message(issue.message)
      .on(file);

    if (issue.endLine != null) {
      location.at(file.newRange(issue.line, issue.column, issue.endLine, issue.endColumn));
    } else {
      location.at(file.selectLine(issue.line));
    }

    newIssue.at(
      location)
      .forRule(ruleKey(issue.ruleId))
      .save();
  }

  private RuleKey ruleKey(String eslintKey) {
    RuleKey ruleKey = checks.ruleKeyByEslintKey(eslintKey);
    if (ruleKey == null) {
      throw new IllegalStateException("No SonarJS rule key found for an eslint-based rule " + eslintKey);
    }
    return ruleKey;
  }

  private static Iterable<InputFile> getInputFiles(SensorContext sensorContext) {
    FileSystem fileSystem = sensorContext.fileSystem();
    FilePredicate mainFilePredicate = sensorContext.fileSystem().predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    return fileSystem.inputFiles(mainFilePredicate);
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("SonarJS ESLint-based rules execution")
      .onlyOnFileType(Type.MAIN);
  }

  private static class AnalysisRequest {
    String filepath;
    String fileContent;
    String[] rules;

    AnalysisRequest(InputFile file, String[] rules) {
      this.filepath = file.uri().toString();
      this.fileContent = fileContent(file);
      this.rules = rules;
    }

    private static String fileContent(InputFile file) {
      try {
        return file.contents();
      } catch (IOException e) {
        throw new IllegalStateException(e);
      }
    }
  }

  static class AnalysisResponseIssue {
    Integer line;
    Integer column;
    Integer endLine;
    Integer endColumn;
    String message;
    String ruleId;
  }

}
