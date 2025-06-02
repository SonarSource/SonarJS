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
package org.sonar.plugins.javascript.bridge;

import com.google.protobuf.CodedInputStream;
import com.google.protobuf.InvalidProtocolBufferException;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class AstProtoUtils {

  private static final Logger LOG = LoggerFactory.getLogger(AstProtoUtils.class);
  /**
   * Our protobuf messages are not really optimized with respect to recursion. For every layer in the original AST,
   * we have two layers in the protobuf message. This is because we have a top level message "Node" wrapping every node.
   * While the default value (100) set by protobuf is a bit short (= 50 layers in the original AST), we observed in practice that
   * it does not go a lot deeper than that, even on the convoluted code of the onion benchmark.
   * We set it to 300 to be on the safe side.
   * It is also worth to mention that the default limit is there to prevent "Malicious inputs".
   * It makes sense as a general default limit for protobuf users, but in our case, we are producing the input ourselves,
   * and even if users are controlling the code, it is not a new security risk, as any analyzer would have to deal with the same limit.
   */
  private static final int PROTOBUF_RECURSION_LIMIT = 300;

  // Prevent instantiation
  private AstProtoUtils() {}

  public static Node readProtobufFromBytes(byte[] bytes) throws IOException {
    return readProtobuf(CodedInputStream.newInstance(bytes));
  }

  private static Node readProtobuf(CodedInputStream input) throws IOException {
    try {
      input.setRecursionLimit(PROTOBUF_RECURSION_LIMIT);
      return Node.parseFrom(input);
    } catch (InvalidProtocolBufferException e) {
      // Failing to parse the protobuf message should not prevent the analysis from continuing.
      // Note: we do not print the stack trace as it is usually huge and does not contain useful information.
      LOG.error("Failed to deserialize Protobuf message: {}", e.getMessage());
      return null;
    }
  }
}
