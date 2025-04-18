/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import javax.annotation.CheckForNull;

public class ProcessWrapperImpl implements ProcessWrapper {

  private StreamConsumer streamConsumer;

  @Override
  public Process startProcess(
    List<String> commandLine,
    Map<String, String> env,
    Consumer<String> outputConsumer,
    Consumer<String> errorConsumer
  ) throws IOException {
    ProcessBuilder processBuilder = new ProcessBuilder(commandLine);
    processBuilder.environment().putAll(env);
    Process process = processBuilder.start();
    streamConsumer = new StreamConsumer();
    streamConsumer.consumeStream(process.getInputStream(), outputConsumer);
    streamConsumer.consumeStream(process.getErrorStream(), errorConsumer);
    return process;
  }

  @Override
  public boolean waitFor(Process process, long timeout, TimeUnit unit) throws InterruptedException {
    boolean waitFor = process.waitFor(timeout, unit);
    streamConsumer.await();
    return waitFor;
  }

  @Override
  public void interrupt() {
    Thread.currentThread().interrupt();
  }

  @Override
  public void destroyForcibly(Process process) {
    process.destroyForcibly();
  }

  @Override
  public boolean isMac() {
    return getOsName().startsWith("mac");
  }

  @Override
  public boolean isWindows() {
    return getOsName().startsWith("windows");
  }

  private static String getOsName() {
    return System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
  }

  @Override
  @CheckForNull
  public String getenv(String name) {
    return System.getenv(name);
  }

  @Override
  public int exitValue(Process process) {
    return process.exitValue();
  }
}
