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

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;

import java.util.Map;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

public class NodeVersion {

  private static final Logger LOG = Loggers.get(NodeVersion.class);

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
