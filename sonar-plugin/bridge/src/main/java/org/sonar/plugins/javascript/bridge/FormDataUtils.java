/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import com.google.protobuf.CodedInputStream;
import com.google.protobuf.InvalidProtocolBufferException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import javax.annotation.CheckForNull;
import org.apache.commons.fileupload.MultipartStream;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class FormDataUtils {

  private static final Logger LOG = LoggerFactory.getLogger(FormDataUtils.class);
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

  private FormDataUtils() {
    throw new IllegalStateException("Utility class");
  }

  public static BridgeServer.BridgeResponse parseFormData(ClassicHttpResponse response) {
    HttpEntity entity = response.getEntity();
    String contentType = entity.getContentType();
    String boundary = contentType.split("boundary=")[1];

    try {
      byte[] responseBytes = EntityUtils.toByteArray(entity);

      String json = null;
      byte[] ast = null;

      try (InputStream inputStream = new ByteArrayInputStream(responseBytes)) {
        MultipartStream multipartStream = new MultipartStream(inputStream, boundary.getBytes(), 1024, null);
        boolean nextPart = multipartStream.skipPreamble();

        while (nextPart) {
          String headers = multipartStream.readHeaders();
          ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
          multipartStream.readBodyData(outputStream);
          byte[] partBytes = outputStream.toByteArray();

          if (headers.contains("json")) {
            json = new String(partBytes, StandardCharsets.UTF_8);
          } else if (headers.contains("ast")) {
            ast = partBytes;
          }
          nextPart = multipartStream.readBoundary();
        }
      }
      if (json == null || ast == null) {
        throw new IllegalStateException("Data missing from response");
      }
      return new BridgeServer.BridgeResponse(json, parseProtobuf(ast));
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  @CheckForNull
  private static Node parseProtobuf(byte[] ast) throws IOException {
    try {
      CodedInputStream input = CodedInputStream.newInstance(ast);
      input.setRecursionLimit(PROTOBUF_RECURSION_LIMIT);
      return Node.parseFrom(input);
    } catch (InvalidProtocolBufferException e) {
      // Failing to parse the protobuf message should not prevent the analysis from continuing.
      // Note: we do not print the stack trace as it is usually huge and does not contain useful information.
      LOG.error("Failed to deserialize Protobuf message: {}", e.getMessage());
    }
    return null;
  }
}
