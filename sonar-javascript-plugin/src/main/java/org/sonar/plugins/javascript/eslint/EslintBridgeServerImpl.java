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

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.sonar.api.batch.ScannerSide;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;

import static org.sonar.plugins.javascript.eslint.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.eslint.NetUtils.waitServerToStart;

@ScannerSide
public class EslintBridgeServerImpl implements EslintBridgeServer {

  private static final Logger LOG = Loggers.get(EslintBridgeServerImpl.class);

  private final OkHttpClient client;
  private final NodeCommandBuilder nodeCommandBuilder;
  private final int timeoutSeconds;
  private int port;
  private NodeCommand nodeCommand;
  private String startServerScript;

  public EslintBridgeServerImpl(NodeCommandBuilder nodeCommandBuilder, int timeoutSeconds, String startServerScript) {
    this.nodeCommandBuilder = nodeCommandBuilder;
    this.timeoutSeconds = timeoutSeconds;
    this.client = new OkHttpClient.Builder()
      .readTimeout(timeoutSeconds, TimeUnit.SECONDS)
      .build();
    this.startServerScript = startServerScript;
  }

  @Override
  public void startServer(SensorContext context) throws IOException {
    port = findOpenPort();

    nodeCommand = nodeCommandBuilder
      .outputConsumer(message -> {
        if (message.startsWith("DEBUG")) {
          LOG.debug(message.substring(5).trim());
        } else {
          LOG.info(message);
        }
      })
      .minNodeVersion(6)
      .configuration(context.config())
      .script(startServerScript)
      .scriptArgs(String.valueOf(port))
      .build();
    LOG.debug("Starting Node.js process to start eslint-bridge server at port " + port);
    nodeCommand.start();

    if (!waitServerToStart("localhost", port, timeoutSeconds * 1000)) {
      throw new IllegalStateException("Timeout error: failed to start server");
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
  public void clean() {
    if (nodeCommand != null) {
      nodeCommand.destroy();
      nodeCommand = null;
    }
  }

  @Override
  public String toString() {
    return "EslintBridgeServerImpl{" +
      "nodeCommand=" + nodeCommand +
      '}';
  }
}
