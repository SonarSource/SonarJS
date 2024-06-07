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
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class FormDataUtils {
  private FormDataUtils() {
    throw new IllegalStateException("Utility class");
  }

  public static BridgeServer.BridgeResponse parseFormData(HttpResponse<String> response) {
    String boundary = "--" + response.headers().firstValue("Content-Type")
      .orElseThrow(() -> new IllegalStateException("No Content-Type header"))
      .split("boundary=")[1];
    String[] parts = response.body().split(boundary);
    String json = null;
    String ast = null;
    for (String part : parts) {
      // Split the part into headers and body
      String[] splitPart = part.split("\r\n\r\n", 2);
      if (splitPart.length < 2) {
        // Skip if there's no body
        continue;
      }

      String headers = splitPart[0];
      String partBody = splitPart[1];

      if (headers.contains("json")) {
        json = partBody;
      } else if (headers.contains("ast")) {
        ast = partBody;
      }
    }
    if (json == null || ast == null) {
      throw new IllegalStateException("Data missing from response");
    }
    try {
      return new BridgeServer.BridgeResponse(json, Node.parseFrom(ast.getBytes(StandardCharsets.UTF_8)));
    } catch (InvalidProtocolBufferException e) {
      throw new IllegalStateException(e);
    }
  }
}
