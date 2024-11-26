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

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.utils.Version;

public class NodeVersion {

  private static final Logger LOG = LoggerFactory.getLogger(NodeVersion.class);

  private NodeVersion() {
    // utility class
  }

  public static String getVersion(ProcessWrapper processWrapper, String nodeExecutable)
    throws NodeCommandException {
    var output = new StringBuilder();
    var nodeCommand = new NodeCommand(
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
        nodeCommand +
        "'"
      );
    }
    return output.toString();
  }
}
