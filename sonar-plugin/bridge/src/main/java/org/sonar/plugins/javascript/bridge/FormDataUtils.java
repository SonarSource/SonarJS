package org.sonar.plugins.javascript.bridge;

import java.net.http.HttpResponse;

public class FormDataUtils {
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
    return new BridgeServer.BridgeResponse(json, ast);
  }
}
