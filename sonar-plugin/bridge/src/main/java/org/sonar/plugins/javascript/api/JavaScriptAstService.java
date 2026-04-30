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
package org.sonar.plugins.javascript.api;

import java.io.IOException;
import java.util.Optional;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AstProtoUtils;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;

/**
 * Service to convert a protobuf-encoded AST into an {@link ESTree.Program}.
 *
 * <p>This interface is part of the public API of the JavaScript plugin and is intended for use
 * by other SonarQube plugins.
 */
public class JavaScriptAstService {
  public Optional<ESTree.Program> getProgram(byte[] astBytes) throws IOException {
    var node = AstProtoUtils.readProtobufFromBytes(astBytes);
    if (node == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(ESTreeFactory.from(node, ESTree.Program.class));
  }
}
