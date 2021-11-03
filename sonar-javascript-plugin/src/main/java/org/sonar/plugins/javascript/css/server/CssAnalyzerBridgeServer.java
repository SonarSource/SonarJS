/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.css.server;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.time.Duration;
import javax.annotation.Nullable;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.sonar.api.Startable;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonar.plugins.javascript.css.server.bundle.Bundle;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;
import org.sonarsource.nodejs.NodeCommandException;

import static org.sonar.plugins.javascript.css.CssRuleSensor.hasCssFiles;
import static org.sonar.plugins.javascript.css.CssRuleSensor.throwFailFast;
import static org.sonarsource.api.sonarlint.SonarLintSide.MULTIPLE_ANALYSES;

@ScannerSide
@SonarLintSide(lifespan = MULTIPLE_ANALYSES)
public class CssAnalyzerBridgeServer implements Startable {

  private static final Logger LOG = Loggers.get(CssAnalyzerBridgeServer.class);
  private static final Profiler PROFILER = Profiler.createIfDebug(LOG);

  private static final int DEFAULT_TIMEOUT_SECONDS = 60;
  // internal property to set "--max-old-space-size" for Node process running this server
  private static final String MAX_OLD_SPACE_SIZE_PROPERTY = "sonar.css.node.maxspace";
  private static final Gson GSON = new Gson();

  private final OkHttpClient client;
  private final NodeCommandBuilder nodeCommandBuilder;
  final int timeoutSeconds;
  private final Bundle bundle;
  private final AnalysisWarnings analysisWarnings;
  private final String hostAddress;
  private int port;
  private NodeCommand nodeCommand;
  private final NodeDeprecationWarning deprecationWarning;
  private boolean failedToStart;

  // Used by pico container for dependency injection
  @SuppressWarnings("unused")
  public CssAnalyzerBridgeServer(Bundle bundle, @Nullable AnalysisWarnings analysisWarnings, NodeDeprecationWarning deprecationWarning) {
    this(NodeCommand.builder(), DEFAULT_TIMEOUT_SECONDS, bundle, analysisWarnings, deprecationWarning);
  }

  protected CssAnalyzerBridgeServer(NodeCommandBuilder nodeCommandBuilder, int timeoutSeconds, Bundle bundle,
                                    @Nullable AnalysisWarnings analysisWarnings, NodeDeprecationWarning deprecationWarning) {
    this.nodeCommandBuilder = nodeCommandBuilder;
    this.timeoutSeconds = timeoutSeconds;
    this.bundle = bundle;
    this.analysisWarnings = analysisWarnings;
    this.client = new OkHttpClient.Builder()
      .callTimeout(Duration.ofSeconds(timeoutSeconds))
      .readTimeout(Duration.ofSeconds(timeoutSeconds))
      .build();
    this.hostAddress = InetAddress.getLoopbackAddress().getHostAddress();
    this.deprecationWarning = deprecationWarning;
  }

  public void deploy(File deployLocation) {
    bundle.deploy(deployLocation.toPath());
  }

  public void startServer(SensorContext context) throws IOException {
    PROFILER.startDebug("Starting server");
    port = NetUtils.findOpenPort();

    File scriptFile = new File(bundle.startServerScript());
    if (!scriptFile.exists()) {
      throw new NodeCommandException("Node.js script to start css-bundle server doesn't exist: " + scriptFile.getAbsolutePath());
    }

    initNodeCommand(context, scriptFile);

    LOG.debug("Starting Node.js process to start css-bundle server at port " + port);
    nodeCommand.start();

    if (!waitServerToStart(timeoutSeconds * 1000)) {
      throw new NodeCommandException("Failed to start server (" + timeoutSeconds + "s timeout)");
    }
    PROFILER.stopDebug();
    deprecationWarning.logNodeDeprecation(nodeCommand.getActualNodeVersion());
  }

  boolean waitServerToStart(int timeoutMs) {
    int sleepStep = 100;
    long start = System.currentTimeMillis();
    try {
      Thread.sleep(sleepStep);
      while (!isAlive()) {
        if (System.currentTimeMillis() - start > timeoutMs) {
          return false;
        }
        Thread.sleep(sleepStep);
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
    return true;
  }

  private void initNodeCommand(SensorContext context, File scriptFile) throws IOException {
    nodeCommandBuilder
      .outputConsumer(message -> {
        if (message.startsWith("DEBUG")) {
          LOG.debug(message.substring(5).trim());
        } else if (message.startsWith("WARN")) {
          LOG.warn(message.substring(4).trim());
        } else {
          LOG.info(message);
        }
      })
      .minNodeVersion(10)
      .configuration(context.config())
      .script(scriptFile.getAbsolutePath())
      .pathResolver(bundle)
      .scriptArgs(String.valueOf(port), hostAddress);

    context.config()
      .getInt(MAX_OLD_SPACE_SIZE_PROPERTY)
      .ifPresent(nodeCommandBuilder::maxOldSpaceSize);

    nodeCommand = nodeCommandBuilder.build();
  }

  /**
   * @return true when server is up and running normally, false otherwise
   */
  public boolean startServerLazily(SensorContext context) throws IOException {
    // required for SonarLint context to avoid restarting already failed server
    if (failedToStart) {
      LOG.debug("Skipping start of css-bundle server due to the failure during first analysis");
      LOG.debug("Skipping execution of CSS rules due to the problems with css-bundle server");
      return false;
    }

    try {
      if (isAlive()) {
        LOG.debug("css-bundle server is up, no need to start.");
        return true;
      }
      deploy(context.fileSystem().workDir());
      startServer(context);
      return true;
    } catch (NodeCommandException e) {
      failedToStart = true;
      processNodeCommandException(e, context);
      return false;
    }
  }

  // happens for example when NodeJS is not available, or version is too old
  private void processNodeCommandException(NodeCommandException e, SensorContext context) {
    String message = "CSS rules were not executed. " + e.getMessage();
    if (hasCssFiles(context)) {
      LOG.error(message, e);
      reportAnalysisWarning(message);
    } else {
      // error logs are often blocking (esp. in Azure), so we log at warning level if there is no CSS files in the project
      LOG.warn(message);
    }
    throwFailFast(context, e);
  }

  public Issue[] analyze(Request request) throws IOException {
    String json = GSON.toJson(request);
    return parseResponse(request(json));
  }

  private String request(String json) throws IOException {
    okhttp3.Request request = new okhttp3.Request.Builder()
      .url(url("analyze"))
      .post(RequestBody.create(MediaType.get("application/json"), json))
      .build();

    try (Response response = client.newCall(request).execute()) {
      // in this case response.body() is never null (according to docs)
      return response.body().string();
    }
  }

  private static Issue[] parseResponse(String result) {
    try {
      return GSON.fromJson(result, Issue[].class);
    } catch (JsonSyntaxException e) {
      String msg = "Failed to parse response: \n-----\n" + result + "\n-----\n";
      LOG.debug(msg);
      throw new IllegalStateException("Failed to parse response (check DEBUG logs for the response content)", e);
    }
  }

  public boolean isAlive() {
    if (nodeCommand == null) {
      return false;
    }
    okhttp3.Request request = new okhttp3.Request.Builder()
      .url(url("status"))
      .get()
      .build();

    try (Response response = client.newCall(request).execute()) {
      String body = response.body().string();
      // in this case response.body() is never null (according to docs)
      return "OK!".equals(body);
    } catch (IOException e) {
      return false;
    }
  }

  public String getCommandInfo() {
    if (nodeCommand == null) {
      return "Node.js command to start css-bundle server was not built yet.";
    } else {
      return "Node.js command to start css-bundle was: " + nodeCommand.toString();
    }
  }

  @Override
  public void start() {
    // Server is started lazily by the sensor
  }

  @Override
  public void stop() {
    clean();
  }

  void clean() {
    if (nodeCommand != null) {
      callClose();
      nodeCommand.waitFor();
      nodeCommand = null;
    }
  }

  private void callClose() {
    okhttp3.Request request = new okhttp3.Request.Builder()
      .url(url("close"))
      .post(RequestBody.create(MediaType.get("application/json"), ""))
      .build();
    try (Response response = client.newCall(request).execute()) {
      // nothing to do here
    } catch (IOException e) {
      LOG.warn("Failed to close stylelint-bridge server", e);
    }
  }

  private HttpUrl url(String endpoint) {
    HttpUrl.Builder builder = new HttpUrl.Builder();
    return builder
      .scheme("http")
      .host(hostAddress)
      .port(port)
      .addPathSegment(endpoint)
      .build();
  }

  // for testing purposes
  public void setPort(int port) {
    this.port = port;
  }

  private void reportAnalysisWarning(String message) {
    if (analysisWarnings != null) {
      analysisWarnings.addUnique(message);
    }
  }

  public static class Request {
    public final String filePath;
    /**
     * The fileContent is sent only in the SonarLint context or when the encoding
     * of the file is not utf-8. Otherwise, for performance reason, it's more efficient to
     * not have the fileContent and let the server getting it using filePath.
     */
    @Nullable
    public final String fileContent;
    public final String configFile;

    public Request(String filePath, @Nullable String fileContent, String configFile) {
      this.filePath = filePath;
      this.fileContent = fileContent;
      this.configFile = configFile;
    }
  }

  public static class Issue {
    public final Integer line;
    public final String rule;
    public final String text;

    public Issue(Integer line, String rule, String text) {
      this.line = line;
      this.rule = rule;
      this.text = text;
    }
  }
}
