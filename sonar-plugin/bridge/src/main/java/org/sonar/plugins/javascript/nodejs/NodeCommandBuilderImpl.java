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

import static java.util.Arrays.asList;
import static java.util.Collections.emptyMap;

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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;

public class NodeCommandBuilderImpl implements NodeCommandBuilder {

  private static final Logger LOG = LoggerFactory.getLogger(NodeCommandBuilderImpl.class);

  public static final String NODE_EXECUTABLE_DEFAULT = "deno";
  private static final String NODE_EXECUTABLE_DEFAULT_MACOS = "package/bin/run-deno";

  private static final Pattern NODEJS_VERSION_PATTERN = Pattern.compile(
    "v?(\\d+)\\.(\\d+)\\.(\\d+)"
  );

  private final ProcessWrapper processWrapper;
  private EmbeddedNode embeddedNode;
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
  private String nodeExecutableOrigin = "none";

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
    //nodeJsArgs("--max-old-space-size=" + maxOldSpaceSize);
    //    nodeJsArgs("--allow-all");
    LOG.info("Configured Node.js --max-old-space-size={}.", maxOldSpaceSize);
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
    String nodeExecutable = locateNode();

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
      env,
      nodeExecutableOrigin
    );
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

  private String locateNode() throws IOException {
    var defaultNode = NODE_EXECUTABLE_DEFAULT;
    if (processWrapper.isMac()) {
      defaultNode = locateNodeOnMac();
      nodeExecutableOrigin = "host";
    } else if (processWrapper.isWindows()) {
      defaultNode = locateNodeOnWindows();
      nodeExecutableOrigin = "host";
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
      LOG.error("Default Node.js executable for MacOS does not exist");
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
      asList("C:\\Windows\\System32\\where.exe", "$PATH:deno.cmd"),
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
