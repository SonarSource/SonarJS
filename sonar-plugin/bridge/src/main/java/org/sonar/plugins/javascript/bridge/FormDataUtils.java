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

import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class FormDataUtils {
  private FormDataUtils() {
    throw new IllegalStateException("Utility class");
  }

  public static BridgeServer.BridgeResponse parseFormData(HttpResponse<byte[]> response) {
    String boundary = "--" + response.headers().firstValue("Content-Type")
      .orElseThrow(() -> new IllegalStateException("No Content-Type header"))
      .split("boundary=")[1];
    byte[] responseBody = response.body();

    // Convert the boundary to bytes
    byte[] boundaryBytes = boundary.getBytes(StandardCharsets.ISO_8859_1);

    // Split the response body into parts using the boundary
    List<byte[]> parts = split(responseBody, boundaryBytes);

    String json = null;
    byte[] ast = null;

    for (byte[] part : parts) {
        // Split the part into headers and body
        int separatorIndex = indexOf(part, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1));
        if (separatorIndex == -1) {
            // Skip if there's no body
            continue;
        }

        byte[] headers = Arrays.copyOfRange(part, 0, separatorIndex);
        byte[] body = Arrays.copyOfRange(part, separatorIndex + 4, part.length);

        String headersStr = new String(headers, StandardCharsets.UTF_8);

        if (headersStr.contains("json")) {
            json = new String(body, StandardCharsets.UTF_8);
        } else if (headersStr.contains("ast")) {
            //ast = body;
            // I may have 2 extra bytes here for some reason
            ast = Arrays.copyOf(body, body.length-2);
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

  public static Node parseProtobuf(byte[] ast) throws IOException {
    return Node.parseFrom(ast);
    //return parseProtobuf(new ByteArrayInputStream(ast.getBytes(StandardCharsets.ISO_8859_1)));
  }



  // Visible for testing.
  public static Node parseProtobuf(InputStream inputStream) throws IOException {
    return Node.parseFrom(inputStream);
  }

  private static int indexOf(byte[] outerArray, byte[] smallerArray) {
    for(int i = 0; i < outerArray.length - smallerArray.length+1; ++i) {
        boolean found = true;
        for(int j = 0; j < smallerArray.length; ++j) {
           if (outerArray[i+j] != smallerArray[j]) {
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
