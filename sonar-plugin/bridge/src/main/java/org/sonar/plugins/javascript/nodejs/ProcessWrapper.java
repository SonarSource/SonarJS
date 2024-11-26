/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.nodejs;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import javax.annotation.CheckForNull;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * This interface provides thin wrapper around Java ProcessBuilder and related APIs. The goal is to make them testable
 * across different OS flavors.
 *
 * It also handles the issue of consuming stdout and stderr of started process in an asynchronous way using a daemon
 * thread
 */
@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.INSTANCE)
public interface ProcessWrapper {
  Process startProcess(
    List<String> commandLine,
    Map<String, String> env,
    Consumer<String> outputConsumer,
    Consumer<String> errorConsumer
  ) throws IOException;

  boolean waitFor(Process process, long timeout, TimeUnit unit) throws InterruptedException;

  void interrupt();

  void destroyForcibly(Process process);

  boolean isMac();

  boolean isWindows();

  @CheckForNull
  String getenv(String name);

  int exitValue(Process process);
}
