/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript.nodejs;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

class StreamConsumer {

  private static final Logger LOG = Loggers.get(StreamConsumer.class);
  private final ExecutorService executorService;

  StreamConsumer() {
    executorService = Executors.newCachedThreadPool(r -> {
      Thread thread = new Thread(r);
      thread.setName("nodejs-stream-consumer");
      thread.setDaemon(true);
      thread.setUncaughtExceptionHandler((t, e) -> LOG.error("Error in thread " + t.getName(), e));
      return thread;
    });
  }

  void consumeStream(InputStream inputStream, Consumer<String> consumer) {
    executorService.submit(() -> {
      try (BufferedReader errorReader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
        errorReader.lines().forEach(consumer);
      } catch (IOException e) {
        LOG.error("Error while reading stream", e);
      }
    });
  }

  void await() throws InterruptedException {
    executorService.shutdown();
    if (!executorService.awaitTermination(5, TimeUnit.MINUTES)) {
      LOG.error("External process stream consumer timed out");
      executorService.shutdownNow();
    }
  }

  boolean isShutdown() {
    return executorService.isShutdown();
  }
}
