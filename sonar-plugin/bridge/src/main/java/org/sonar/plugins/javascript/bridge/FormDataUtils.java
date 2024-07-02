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

import com.google.protobuf.InvalidProtocolBufferException;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import javax.annotation.CheckForNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class FormDataUtils {

  private static final Logger LOG = LoggerFactory.getLogger(FormDataUtils.class);

  private FormDataUtils() {
    throw new IllegalStateException("Utility class");
  }

  public static BridgeServer.BridgeResponse parseFormData(HttpResponse<byte[]> response) {
    String boundary = "--" + response.headers().firstValue("Content-Type")
      .orElseThrow(() -> new IllegalStateException("No Content-Type header"))
      .split("boundary=")[1];

    byte[] responseBody = response.body();
    byte[] boundaryBytes = boundary.getBytes(StandardCharsets.ISO_8859_1);
    List<byte[]> parts = split(responseBody, boundaryBytes);

    String json = null;
    byte[] ast = null;

    for (byte[] part : parts) {
      int separatorIndex = indexOf(part, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1));
      if (separatorIndex == -1) {
        // Skip if there's no body
        continue;
      }

      // I remove the first 2 bytes, representing "\r\n" before the headers
      byte[] headers = Arrays.copyOfRange(part, 2, separatorIndex);
      // I remove the first 4 bytes and last 2.
      // They are the "\r\n\r\n" before and "\r\n" after the payload
      byte[] body = Arrays.copyOfRange(part, separatorIndex + 4, part.length - 2);

      String headersStr = new String(headers, StandardCharsets.UTF_8);

      if (headersStr.contains("json")) {
        json = new String(body, StandardCharsets.UTF_8);
      } else if (headersStr.contains("ast")) {
        ast = body;
      }
    }
    if (json == null || ast == null) {
      throw new IllegalStateException("Data missing from response");
    }
    try {
      return new BridgeServer.BridgeResponse(json, parseProtobuf(ast));
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  @CheckForNull
  private static Node parseProtobuf(byte[] ast) throws IOException {
    try {
      return Node.parseFrom(ast);
    } catch (InvalidProtocolBufferException e) {
      // Failing to parse the protobuf message should not prevent the analysis from continuing.
      // This also happen in the case of large recursion. See https://sonarsource.atlassian.net/browse/JS-185.
      // Note: we do not print the stack trace as it is huge and does not contain useful information.
      LOG.error("Failed to deserialize Protobuf message: {}", e.getMessage());
    }
    return null;
  }

  private static int indexOf(byte[] array, byte[] pattern) {
    for (int i = 0; i < array.length - pattern.length + 1; i++) {
      boolean found = true;
      for (int j = 0; j < pattern.length; j++) {
        if (array[i + j] != pattern[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  }

  private static List<byte[]> split(byte[] array, byte[] delimiter) {
    List<byte[]> byteArrays = new LinkedList<>();
    if (delimiter.length == 0) {
      return byteArrays;
    }
    int begin = 0;

    outer:
    for (int i = 0; i < array.length - delimiter.length + 1; i++) {
      for (int j = 0; j < delimiter.length; j++) {
        if (array[i + j] != delimiter[j]) {
          continue outer;
        }
      }
      byteArrays.add(Arrays.copyOfRange(array, begin, i));
      begin = i + delimiter.length;
    }
    byteArrays.add(Arrays.copyOfRange(array, begin, array.length));
    return byteArrays;
  }
}
