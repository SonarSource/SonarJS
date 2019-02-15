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

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import javax.annotation.Nullable;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.nodejs.BundleUtils;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;

import static org.sonar.plugins.javascript.eslint.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.eslint.NetUtils.waitServerToStart;

public class EslintBridgeServerImpl implements EslintBridgeServer {

  private static final Logger LOG = Loggers.get(EslintBridgeServerImpl.class);

  private static final int DEFAULT_TIMEOUT_SECONDS = 10;
  private static final String DEFAULT_STARTUP_SCRIPT = "node_modules/eslint-bridge/bin/server";
  private static final String DEPLOY_LOCATION = "eslint-bridge-bundle";

  // this archive is created in eslint-bridge/scripts/package.js
  private static final String BUNDLE_LOCATION = "/eslint-bridge.tar.xz";

  private final OkHttpClient client;
  private final NodeCommandBuilder nodeCommandBuilder;
  private final int timeoutSeconds;
  private int port;
  private NodeCommand nodeCommand;
  private String startServerScript;
  private String bundleLocation;
  private Path deployLocation;
  private Configuration configuration;

  // Used by pico container for dependency injection
  @SuppressWarnings("unused")
  public EslintBridgeServerImpl(Configuration configuration, NodeCommandBuilder nodeCommandBuilder, TempFolder tempFolder) {
    this(configuration, nodeCommandBuilder, tempFolder, DEFAULT_TIMEOUT_SECONDS, DEFAULT_STARTUP_SCRIPT, BUNDLE_LOCATION);
  }

  EslintBridgeServerImpl(@Nullable Configuration configuration, NodeCommandBuilder nodeCommandBuilder,
                         TempFolder tempFolder,
                         int timeoutSeconds,
                         String startServerScript,
                         String bundleLocation) {
    this.nodeCommandBuilder = nodeCommandBuilder;
    this.timeoutSeconds = timeoutSeconds;
    this.startServerScript = startServerScript;
    this.client = new OkHttpClient.Builder()
      .readTimeout(timeoutSeconds, TimeUnit.SECONDS)
      .build();
    this.deployLocation = tempFolder.newDir(DEPLOY_LOCATION).toPath();
    this.bundleLocation = bundleLocation;
    this.configuration = configuration;
  }

  @Override
  public void deploy() throws IOException {
    long start = System.currentTimeMillis();
    LOG.debug("Deploying eslint-bridge into {}", deployLocation);
    InputStream bundle = getClass().getResourceAsStream(bundleLocation);
    if (bundle == null) {
      throw new IllegalStateException("eslint-bridge not found in plugin jar");
    }
    BundleUtils.extractFromClasspath(bundle, deployLocation);
    LOG.debug("Deployment done in {}ms", System.currentTimeMillis() - start);
  }

  @Override
  public void startServer() throws IOException {
    port = findOpenPort();

    File scriptFile = deployLocation.resolve(startServerScript).toFile();
    if (!scriptFile.exists()) {
      throw new IllegalStateException("Node.js script to start eslint-bridge server doesn't exist: " + scriptFile.getAbsolutePath());
    }
    nodeCommand = nodeCommandBuilder
      .outputConsumer(message -> {
        if (message.startsWith("DEBUG")) {
          LOG.debug(message.substring(5).trim());
        } else {
          LOG.info(message);
        }
      })
      .minNodeVersion(6)
      .configuration(configuration)
      .script(scriptFile.getAbsolutePath())
      .scriptArgs(String.valueOf(port))
      .build();
    LOG.debug("Starting Node.js process to start eslint-bridge server at port " + port);
    nodeCommand.start();

    if (!waitServerToStart("localhost", port, timeoutSeconds * 1000)) {
      throw new IllegalStateException("Failed to start server (" + timeoutSeconds +"s timeout)");
    }

    LOG.debug("Server is started");
  }

  @Override
  public String call(String json) throws IOException {
    Request request = new Request.Builder()
      .url("http://localhost:" + port + "/analyze")
      .post(RequestBody.create(MediaType.get("application/json"), json))
      .build();

    try (Response response = client.newCall(request).execute()) {
      // in this case response.body() is never null (according to docs)
      return response.body().string();
    }
  }

  @Override
  public boolean isAlive() {
    if (nodeCommand == null) {
      return false;
    }
    Request request = new Request.Builder()
      .url("http://localhost:" + port + "/status")
      .get()
      .build();

    try (Response response = client.newCall(request).execute()) {
      String body = response.body().string();
      LOG.debug("Response to isAlive request: {}", body);
      // in this case response.body() is never null (according to docs)
      return "OK!".equals(body);
    } catch (IOException e) {
      LOG.error("Error requesting server status. Server is probably dead.", e);
      return false;
    }
  }

  @Override
  public void clean() {
    if (nodeCommand != null) {
      nodeCommand.destroy();
      nodeCommand = null;
    }
  }

  @Override
  public String getCommandInfo() {
    if (nodeCommand == null) {
      return "Node.js command to start eslint-bridge server was not built yet.";
    } else {
      return "Node.js command to start eslint-bridge was: " + nodeCommand.toString();
    }
  }

  @Override
  public void start() {
    try {
      deploy();
      startServer();
    } catch (IOException e) {
      throw new IllegalStateException("Failed to start EslintBridgeServer component", e);
    }
  }

  @Override
  public void stop() {
    clean();
  }
}
