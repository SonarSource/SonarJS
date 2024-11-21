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
package org.sonar.plugins.javascript.lcov;

import java.util.LinkedHashMap;
import java.util.Map;
import org.sonar.api.batch.fs.InputFile;

class ReversePathTree {

  private Node root = new Node();

  void index(InputFile inputFile, String[] path) {
    Node currentNode = root;
    for (int i = path.length - 1; i >= 0; i--) {
      currentNode = currentNode.children.computeIfAbsent(path[i], e -> new Node());
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
    return getFirstLeaf(currentNode);
  }

  private static InputFile getFirstLeaf(Node node) {
    while (!node.children.isEmpty()) {
      node = node.children.values().iterator().next();
    }
    return node.file;
  }

  static class Node {

    final Map<String, Node> children = new LinkedHashMap<>();
    InputFile file = null;
  }
}
