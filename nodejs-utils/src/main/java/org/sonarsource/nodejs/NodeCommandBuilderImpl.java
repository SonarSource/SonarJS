/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.annotation.Nullable;
import org.sonar.api.config.Configuration;
import org.sonar.api.internal.google.common.annotations.VisibleForTesting;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;

class NodeCommandBuilderImpl implements NodeCommandBuilder {

  private static final Logger LOG = Loggers.get(NodeCommandBuilderImpl.class);

  private static final String NODE_EXECUTABLE_DEFAULT = "node";

  private static final String NODE_EXECUTABLE_PROPERTY = "sonar.nodejs.executable";

  private static final Pattern NODEJS_VERSION_PATTERN = Pattern.compile("v?(\\d+)\\.\\d+\\.\\d+");

  private final NodeCommand.ProcessWrapper processWrapper;
  private Integer minNodeVersion;
  private Configuration configuration;
  private List<String> args = new ArrayList<>();
  private List<String> nodeJsArgs = new ArrayList<>();
  private Consumer<String> outputConsumer = LOG::info;
  private Consumer<String> errorConsumer = LOG::error;
  private String scriptFilename;

  NodeCommandBuilderImpl(NodeCommand.ProcessWrapper processWrapper) {
    this.processWrapper = processWrapper;
  }

  @Override
  public NodeCommandBuilder minNodeVersion(int minNodeVersion) {
    this.minNodeVersion = minNodeVersion;
    return this;
  }

  @Override
  public NodeCommandBuilder configuration(Configuration configuration) {
    this.configuration = configuration;
    return this;
  }

  @Override
  public NodeCommandBuilder maxOldSpaceSize(int maxOldSpaceSize) {
    nodeJsArgs("--max-old-space-size=" + maxOldSpaceSize);
    return this;
  }

  @Override
  public NodeCommandBuilder nodeJsArgs(String... nodeJsArgs) {
    this.nodeJsArgs.addAll(Arrays.asList(nodeJsArgs));
    return this;
  }

  @Override
  public NodeCommandBuilder script(String scriptFilename) {
    this.scriptFilename = scriptFilename;
    return this;
  }

  @Override
  public NodeCommandBuilder scriptArgs(String... args) {
    this.args.addAll(Arrays.asList(args));
    return this;
  }

  @Override
  public NodeCommandBuilder outputConsumer(Consumer<String> consumer) {
    this.outputConsumer = consumer;
    return this;
  }

  @Override
  public NodeCommandBuilder errorConsumer(Consumer<String> consumer) {
    this.errorConsumer = consumer;
    return this;
  }

  /**
   * Retrieves node executable from sonar.node.executable property or using default if absent.
   * Then will check Node.js version by running {@code node -v}, then
   * returns {@link NodeCommand} instance.
   *
   * @throws NodeCommandException when actual Node.js version doesn't satisfy minimum version requested,
   * or if failed to run {@code node -v}
   */
  @Override
  public NodeCommand build() throws NodeCommandException {
    String nodeExecutable = retrieveNodeExecutableFromConfig(configuration);
    checkNodeCompatibility(nodeExecutable);

    if (nodeJsArgs.isEmpty() && scriptFilename == null && args.isEmpty()) {
      throw new IllegalArgumentException("Missing arguments for Node.js.");
    }
    if (scriptFilename == null && !args.isEmpty()) {
      throw new IllegalArgumentException("No script provided, but script arguments found.");
    }
    return new NodeCommand(
      processWrapper,
      nodeExecutable,
      nodeJsArgs,
      scriptFilename,
      args,
      outputConsumer,
      errorConsumer);
  }

  private void checkNodeCompatibility(String nodeExecutable) throws NodeCommandException {
    if (minNodeVersion == null) {
      return;
    }
    LOG.debug("Checking Node.js version");

    String actualVersion = getVersion(nodeExecutable);
    boolean isCompatible = checkVersion(actualVersion, minNodeVersion);
    if (!isCompatible) {
      throw new NodeCommandException(String.format("Only Node.js v%s or later is supported, got %s.", minNodeVersion, actualVersion));
    }

    LOG.debug("Using Node.js {}.", actualVersion);
  }

  @VisibleForTesting
  static boolean checkVersion(String actualVersion, int requiredVersion) throws NodeCommandException {
    Matcher versionMatcher = NODEJS_VERSION_PATTERN.matcher(actualVersion);
    if (versionMatcher.lookingAt()) {
      int major = Integer.parseInt(versionMatcher.group(1));
      if (major < requiredVersion) {
        return false;
      }
    } else {
      throw new NodeCommandException("Failed to parse Node.js version, got '" + actualVersion + "'");
    }

    return true;
  }

  private String getVersion(String nodeExecutable) throws NodeCommandException {
    StringBuilder output = new StringBuilder();
    NodeCommand nodeCommand = new NodeCommand(processWrapper, nodeExecutable, singletonList("-v"), null, emptyList(), output::append, LOG::error);
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    if (exitValue != 0) {
      throw new NodeCommandException("Failed to determine the version of Node.js, exit value " + exitValue + ". Executed: '" + nodeCommand.toString() + "'");
    }
    return output.toString();
  }

  private static String retrieveNodeExecutableFromConfig(@Nullable Configuration configuration) throws NodeCommandException {
    if (configuration != null && configuration.hasKey(NODE_EXECUTABLE_PROPERTY)) {
      String nodeExecutable = configuration.get(NODE_EXECUTABLE_PROPERTY).get();
      File file = new File(nodeExecutable);
      if (file.exists()) {
        LOG.info("Using Node.js executable {} from property {}.", file.getAbsoluteFile(), NODE_EXECUTABLE_PROPERTY);
        return nodeExecutable;
      } else {
        LOG.error("Provided Node.js executable file does not exist. Property '{}' was to '{}'", NODE_EXECUTABLE_PROPERTY, nodeExecutable);
        throw new NodeCommandException("Provided Node.js executable file does not exist.");
      }
    }

    LOG.debug("Using default Node.js executable: '{}'.", NODE_EXECUTABLE_DEFAULT);
    return NODE_EXECUTABLE_DEFAULT;
  }
}
