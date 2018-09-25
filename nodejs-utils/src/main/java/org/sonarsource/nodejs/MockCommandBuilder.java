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
package org.sonarsource.nodejs;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.Collections;
import java.util.function.Consumer;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

/**
 * This class can be used as a mock for {@link NodeCommandBuilder} to replace external invocation with in-process one
 *
 * <pre>
 * {@code
 *   NodeCommand nodeCommand = new MockCommandBuilder("stdout", "stderr", 0).build();
 *   nodeCommand.start();
 * }
 * </pre>
 *
 * After invocation of {@code NodeCommand.start()} {@code outputConsumer } and {@code errorConsumer} will be invoked with values passed in the constructor line-by-line
 *
 * To simulate failure in {@code NodeCommand.start()} you can configure builder with {@code throwOnStart()} method.
 *
 */
public class MockCommandBuilder implements NodeCommandBuilder {

  private static final Logger LOG = Loggers.get(MockCommandBuilder.class);

  private final String output;
  private final String error;
  private final int exitValue;
  private Consumer<String> outputConsumer = LOG::info;
  private Consumer<String> errorConsumer = LOG::error;
  private RuntimeException throwOnStart;

  public MockCommandBuilder(String output, String error, int exitValue) {
    this.output = output;
    this.error = error;
    this.exitValue = exitValue;
  }

  @Override
  public MockCommandBuilder minNodeVersion(int minNodeVersion) {
    return this;
  }

  @Override
  public MockCommandBuilder configuration(Configuration configuration) {
    return this;
  }

  @Override
  public MockCommandBuilder maxOldSpaceSize(int maxOldSpaceSize) {
    return this;
  }

  @Override
  public MockCommandBuilder nodeJsArgs(String... nodeJsArgs) {
    return this;
  }

  @Override
  public MockCommandBuilder script(String scriptFilename) {
    return this;
  }

  @Override
  public MockCommandBuilder scriptArgs(String... args) {
    return this;
  }

  public MockCommandBuilder throwOnStart(RuntimeException exception) {
    throwOnStart = exception;
    return this;
  }

  @Override
  public NodeCommandBuilder outputConsumer(Consumer<String> consumer) {
    outputConsumer = consumer;
    return this;
  }

  @Override
  public NodeCommandBuilder errorConsumer(Consumer<String> consumer) {
    errorConsumer = consumer;
    return this;
  }

  @Override
  public NodeCommand build() {
    return new MockCommand(outputConsumer, errorConsumer);
  }

  private class MockCommand extends NodeCommand {

    private MockCommand(Consumer<String> outputConsumer, Consumer<String> errorConsumer) {
      super(null, "", Collections.emptyList(), "", Collections.emptyList(), outputConsumer, errorConsumer);
    }

    @Override
    public void start() {
      if (throwOnStart != null) {
        throw throwOnStart;
      }
      new BufferedReader(new StringReader(output)).lines().forEach(outputConsumer);
      new BufferedReader(new StringReader(error)).lines().forEach(errorConsumer);
    }

    @Override
    public int waitFor() {
      return exitValue;
    }

    @Override
    public void destroy() {
      // no-op in case of MockCommand
    }

    @Override
    public String toString() {
      return "mock-node mock-command";
    }
  }

}
