/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.lcov;

import java.util.LinkedHashMap;
import java.util.Map;
import org.sonar.api.batch.fs.InputFile;

class ReversePathTree {

  private Node root = new Node();

  void index(InputFile inputFile, String[] path) {
    Node currentNode = root;
    currentNode.leafCount++;
    for (int i = path.length - 1; i >= 0; i--) {
      currentNode = currentNode.children.computeIfAbsent(path[i], e -> new Node());
      currentNode.leafCount++;
    }
    currentNode.file = inputFile;
  }

  InputFile getFileWithSuffix(String[] path) {
    Node currentNode = root;

    for (int i = path.length - 1; i >= 0; i--) {
      currentNode = currentNode.children.get(path[i]);
      if (currentNode == null) {
        return null;
      }
    }
    return getOnlyLeaf(currentNode);
  }

  private static InputFile getOnlyLeaf(Node node) {
    if (node.leafCount != 1) {
      return null;
    }
    if (node.file != null) {
      return node.file;
    }
    for (Node child : node.children.values()) {
      InputFile inputFile = getOnlyLeaf(child);
      if (inputFile != null) {
        return inputFile;
      }
    }
    return null;
  }

  static class Node {

    final Map<String, Node> children = new LinkedHashMap<>();
    InputFile file = null;
    int leafCount = 0;
  }
}
