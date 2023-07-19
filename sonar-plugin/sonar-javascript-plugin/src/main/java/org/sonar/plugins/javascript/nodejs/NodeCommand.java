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

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import javax.annotation.Nullable;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

/**
 * Represents invocation of external NodeJS process. Use {@link NodeCommandBuilder} to create instance of this class.
 * Once created you can call {@code start()} to start external process, {@code waitFor()} to wait until process
 * terminates and {@code destroy()} to kill the process.
 *
 * Standard and error output are consumed asynchronously in separate threads and each line is supplied to the
 * consumer set via {@link NodeCommandBuilder#outputConsumer(Consumer)} or {@link NodeCommandBuilder#errorConsumer(Consumer)}.
 * When no consumers are set, by default it will use logger to log output of external process - standard output at INFO level
 * and error output at ERROR level.
 */
public class NodeCommand {

  private static final Logger LOG = Loggers.get(NodeCommand.class);

  final Consumer<String> outputConsumer;
  final Consumer<String> errorConsumer;
  private final ProcessWrapper processWrapper;
  private final Map<String, String> env;
  private Process process;
  private final List<String> command;

  NodeCommand(
    ProcessWrapper processWrapper,
    List<String> nodeJsArgs,
    @Nullable String scriptFilename,
    List<String> args,
    Consumer<String> outputConsumer,
    Consumer<String> errorConsumer,
    Map<String, String> env
  ) {
    this.processWrapper = processWrapper;
    this.command = buildCommand(nodeJsArgs, scriptFilename, args);
    this.outputConsumer = outputConsumer;
    this.errorConsumer = errorConsumer;
    this.env = env;
  }

  /**
   * Start external NodeJS process
   *
   * @throws NodeCommandException when start of the external process fails
   */
  public void start() {
    try {
      LOG.debug("Launching command {}", toString());
      LOG.error("starting node process with command '" + command + "' and env: ");
      for(Map.Entry mp: env.entrySet()){
        System.out.println(mp.getKey()+ " "+mp.getValue());
      }
      process = processWrapper.startProcess(command, env, outputConsumer, errorConsumer);
    } catch (IOException e) {
      LOG.error("error: " + e.toString());
      LOG.error("command: " + command);
      LOG.error("env: " + env);
      throw new NodeCommandException(
        "Error when running: '" + toString() + "'. Is Node.js available during analysis?",
        e
      );
    }
  }

  private static List<String> buildCommand(
    List<String> nodeJsArgs,
    @Nullable String scriptFilename,
    List<String> args
  ) {
    List<String> result = new ArrayList<>();
    if (scriptFilename != null) {
      result.add(scriptFilename);
    }
    result.addAll(args);
    return result;
  }

  /**
   * Wait for external process to terminate
   * @return exit value of the external process
   */
  public int waitFor() {
    try {
      int exitValue;
      boolean success = processWrapper.waitFor(process, 1, TimeUnit.MINUTES);
      if (success) {
        exitValue = processWrapper.exitValue(process);
      } else {
        LOG.error("Node process did not stop in a timely fashion");
        processWrapper.destroyForcibly(process);
        exitValue = -1;
      }
      return exitValue;
    } catch (InterruptedException e) {
      processWrapper.interrupt();
      LOG.error("Interrupted while waiting for process to terminate.");
      return 1;
    }
  }

  @Override
  public String toString() {
    return String.join(" ", command);
  }

  public static NodeCommandBuilder builder() {
    return builder(new ProcessWrapperImpl());
  }

  static NodeCommandBuilder builder(ProcessWrapper processWrapper) {
    return new NodeCommandBuilderImpl(processWrapper);
  }
}
