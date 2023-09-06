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

import static java.util.Arrays.asList;
import static java.util.Collections.emptyList;
import static java.util.Collections.emptyMap;
import static java.util.Collections.singletonList;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.annotation.Nullable;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;

public class NodeCommandBuilderImpl implements NodeCommandBuilder {

  private static final Logger LOG = Loggers.get(NodeCommandBuilderImpl.class);

  public static final String NODE_EXECUTABLE_DEFAULT = "node";
  private static final String NODE_EXECUTABLE_DEFAULT_MACOS =
    "package/node_modules/run-node/run-node";

  private static final String NODE_EXECUTABLE_PROPERTY = "sonar.nodejs.executable";

  private static final Pattern NODEJS_VERSION_PATTERN = Pattern.compile(
    "v?(\\d+)\\.(\\d+)\\.(\\d+)"
  );

  private final ProcessWrapper processWrapper;
  private EmbeddedNode embeddedNode = new EmbeddedNode();
  private Version minNodeVersion;
  private Configuration configuration;
  private List<String> args = new ArrayList<>();
  private List<String> nodeJsArgs = new ArrayList<>();
  private Consumer<String> outputConsumer = LOG::info;
  private Consumer<String> errorConsumer = LOG::error;
  private String scriptFilename;
  private BundlePathResolver pathResolver;
  private Version actualNodeVersion;
  private Map<String, String> env = Map.of();

  public NodeCommandBuilderImpl(ProcessWrapper processWrapper) {
    this.processWrapper = processWrapper;
  }

  @Override
  public NodeCommandBuilder minNodeVersion(Version minNodeVersion) {
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
    this.nodeJsArgs.addAll(asList(nodeJsArgs));
    return this;
  }

  @Override
  public NodeCommandBuilder script(String scriptFilename) {
    this.scriptFilename = scriptFilename;
    return this;
  }

  @Override
  public NodeCommandBuilder scriptArgs(String... args) {
    this.args = asList(args);
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

  @Override
  public NodeCommandBuilder pathResolver(BundlePathResolver pathResolver) {
    this.pathResolver = pathResolver;
    return this;
  }

  @Override
  public NodeCommandBuilder env(Map<String, String> env) {
    this.env = Map.copyOf(env);
    return this;
  }

  @Override
  public NodeCommandBuilder embeddedNode(EmbeddedNode embeddedNode) {
    this.embeddedNode = embeddedNode;
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
  public NodeCommand build() throws NodeCommandException, IOException {
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
      actualNodeVersion,
      nodeJsArgs,
      scriptFilename,
      args,
      outputConsumer,
      errorConsumer,
      env
    );
  }

  private void checkNodeCompatibility(String nodeExecutable) throws NodeCommandException {
    if (minNodeVersion == null) {
      return;
    }
    LOG.debug("Checking Node.js version");

    String versionString = getVersion(nodeExecutable);
    actualNodeVersion = nodeVersion(versionString);
    if (!actualNodeVersion.isGreaterThanOrEqual(minNodeVersion)) {
      throw new NodeCommandException(
        String.format(
          "Only Node.js v%s or later is supported, got %s.",
          minNodeVersion,
          actualNodeVersion
        )
      );
    }

    LOG.debug("Using Node.js {}.", versionString);
  }

  // Visible for testing
  static Version nodeVersion(String versionString) throws NodeCommandException {
    Matcher versionMatcher = NODEJS_VERSION_PATTERN.matcher(versionString);
    if (versionMatcher.lookingAt()) {
      return Version.create(
        Integer.parseInt(versionMatcher.group(1)),
        Integer.parseInt(versionMatcher.group(2)),
        Integer.parseInt(versionMatcher.group(3))
      );
    } else {
      throw new NodeCommandException(
        "Failed to parse Node.js version, got '" + versionString + "'"
      );
    }
  }

  private String getVersion(String nodeExecutable) throws NodeCommandException {
    StringBuilder output = new StringBuilder();
    NodeCommand nodeCommand = new NodeCommand(
      processWrapper,
      nodeExecutable,
      Version.create(0, 0),
      singletonList("-v"),
      null,
      emptyList(),
      output::append,
      LOG::error,
      //Avoid default error message from run-node: https://github.com/sindresorhus/run-node#customizable-cache-path-and-error-message
      Map.of(
        "RUN_NODE_ERROR_MSG",
        "Couldn't find the Node.js binary. Ensure you have Node.js installed."
      )
    );
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    if (exitValue != 0) {
      throw new NodeCommandException(
        "Failed to determine the version of Node.js, exit value " +
        exitValue +
        ". Executed: '" +
        nodeCommand.toString() +
        "'"
      );
    }
    return output.toString();
  }

  private String retrieveNodeExecutableFromConfig(@Nullable Configuration configuration)
    throws NodeCommandException, IOException {
    if (configuration != null && configuration.hasKey(NODE_EXECUTABLE_PROPERTY)) {
      String nodeExecutable = configuration.get(NODE_EXECUTABLE_PROPERTY).get();
      File file = new File(nodeExecutable);
      if (file.exists()) {
        LOG.info(
          "Using Node.js executable {} from property {}.",
          file.getAbsoluteFile(),
          NODE_EXECUTABLE_PROPERTY
        );
        return nodeExecutable;
      } else {
        LOG.error(
          "Provided Node.js executable file does not exist. Property '{}' was set to '{}'",
          NODE_EXECUTABLE_PROPERTY,
          nodeExecutable
        );
        throw new NodeCommandException("Provided Node.js executable file does not exist.");
      }
    }

    return locateNode();
  }

  private String locateNode() throws IOException {
    if (embeddedNode.isAvailable()) {
      var embedded = embeddedNode.binary();
      return embedded.toString();
    }
    String defaultNode = NODE_EXECUTABLE_DEFAULT;
    if (processWrapper.isMac()) {
      defaultNode = locateNodeOnMac();
    } else if (processWrapper.isWindows()) {
      defaultNode = locateNodeOnWindows();
    }
    LOG.info("Using Node.js executable: '{}'.", defaultNode);
    return defaultNode;
  }

  private String locateNodeOnMac() throws IOException {
    // on Mac when e.g. IntelliJ is launched from dock, node will often not be available via PATH, because PATH is configured
    // in .bashrc or similar, thus we launch node via 'run-node', which should load required configuration
    LOG.debug("Looking for Node.js in the PATH using run-node (macOS)");
    String defaultNode = pathResolver.resolve(NODE_EXECUTABLE_DEFAULT_MACOS);
    File file = new File(defaultNode);
    if (!file.exists()) {
      LOG.error(
        "Default Node.js executable for MacOS does not exist. Value '{}'. Consider setting Node.js location through property '{}'",
        defaultNode,
        NODE_EXECUTABLE_PROPERTY
      );
      throw new NodeCommandException("Default Node.js executable for MacOS does not exist.");
    } else {
      Files.setPosixFilePermissions(
        file.toPath(),
        EnumSet.of(PosixFilePermission.OWNER_EXECUTE, PosixFilePermission.OWNER_READ)
      );
    }
    return defaultNode;
  }

  private String locateNodeOnWindows() throws IOException {
    // Windows will search current directory in addition to the PATH variable, which is unsecure.
    // To avoid it we use where.exe to find node binary only in PATH. See SSF-181
    LOG.debug("Looking for Node.js in the PATH using where.exe (Windows)");
    List<String> stdOut = new ArrayList<>();
    Process whereTool = processWrapper.startProcess(
      asList("C:\\Windows\\System32\\where.exe", "$PATH:node.exe"),
      emptyMap(),
      stdOut::add,
      LOG::error
    );
    try {
      processWrapper.waitFor(whereTool, 5, TimeUnit.SECONDS);
      if (!stdOut.isEmpty()) {
        String out = stdOut.get(0);
        LOG.debug("Found node.exe at {}", out);
        return out;
      }
    } catch (InterruptedException e) {
      processWrapper.interrupt();
      LOG.error("Interrupted while waiting for 'where.exe' to terminate.");
    }
    throw new NodeCommandException(
      "Node.js not found in PATH. PATH value was: " + processWrapper.getenv("PATH")
    );
  }
}
