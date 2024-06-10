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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.NodeType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.bridge.FormDataUtils.parseFormData;

class FormDataUtilsTest {

  @Test
  void should_parse_form_data_into_bridge_response() {
    HttpResponse<String> mockResponse = mock(HttpResponse.class);
    var values = new HashMap<String, List<String>>();
    values.put("Content-Type", List.of("multipart/form-data; boundary=---------------------------9051914041544843365972754266"));
    when(mockResponse.headers()).thenReturn(HttpHeaders.of(values, (_a, _b) -> true));
    when(mockResponse.body()).thenReturn("-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"json\"" +
      "\r\n" +
      "\r\n" +
      "{\"hello\":\"worlds\"}" +
      "\r\n" +
      "-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"ast\"" +
      "\r\n" +
      "\r\n" +
      "plop" +
      "\r\n" +
      "-----------------------------9051914041544843365972754266--" +
      "\r\n");
    BridgeServer.BridgeResponse response = parseFormData(mockResponse);
    assertThat(response.ast()).isNotNull();
    assertThat(response.json()).contains("{\"hello\":\"worlds\"}");
  }

  @Test
  void should_parse_protobuf_data() throws IOException {
    File protobufFile = Path.of("src", "test", "resources", "serialized-ast", "serialized.proto").toFile();
    Node node = FormDataUtils.parseProtobuf(new FileInputStream(protobufFile));
    assertThat(node).isNotNull();
    assertThat(node.getType()).isEqualTo(NodeType.ProgramType);
  }

  @Test
  void should_throw_an_error_if_json_is_missing() {
    HttpResponse<String> mockResponse = mock(HttpResponse.class);
    var values = new HashMap<String, List<String>>();
    values.put("Content-Type", List.of("multipart/form-data; boundary=---------------------------9051914041544843365972754266"));
    when(mockResponse.headers()).thenReturn(HttpHeaders.of(values, (_a, _b) -> true));
    when(mockResponse.body()).thenReturn("-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"ast\"" +
      "\r\n" +
      "\r\n" +
      "plop" +
      "\r\n" +
      "-----------------------------9051914041544843365972754266--" +
      "\r\n");
    assertThatThrownBy(() -> parseFormData(mockResponse))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Data missing from response");
  }

  @Test
  void should_throw_an_error_if_ast_is_missing() {
    HttpResponse<String> mockResponse = mock(HttpResponse.class);
    var values = new HashMap<String, List<String>>();
    values.put("Content-Type", List.of("multipart/form-data; boundary=---------------------------9051914041544843365972754266"));
    when(mockResponse.headers()).thenReturn(HttpHeaders.of(values, (_a, _b) -> true));
    when(mockResponse.body()).thenReturn("-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"json\"" +
      "\r\n" +
      "\r\n" +
      "{\"hello\":\"worlds\"}" +
      "\r\n" +
      "-----------------------------9051914041544843365972754266--" +
      "\r\n");
    assertThatThrownBy(() -> parseFormData(mockResponse))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Data missing from response");
  }
}
