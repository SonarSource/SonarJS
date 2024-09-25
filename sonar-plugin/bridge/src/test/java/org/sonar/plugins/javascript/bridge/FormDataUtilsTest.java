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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.bridge.FormDataUtils.parseFormData;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import javax.annotation.Nullable;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.HttpEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class FormDataUtilsTest {

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.ERROR);

  @Test
  void should_parse_form_data_into_bridge_response2() throws Exception {
    ClassicHttpResponse mockResponse = mock(ClassicHttpResponse.class);
    HttpEntity mockEntity = mock(HttpEntity.class);
    when(mockEntity.getContentType()).thenReturn("multipart/form-data; boundary=---------------------------9051914041544843365972754266");
    var body = buildPayload("{\"hello\":\"worlds\"}");
    when(mockEntity.getContent()).thenReturn(new ByteArrayInputStream(body));
    when(mockResponse.getEntity()).thenReturn(mockEntity);

    BridgeServer.BridgeResponse response = parseFormData(mockResponse);
    assertThat(response.json()).contains("{\"hello\":\"worlds\"}");
    Node node = response.ast();
    assertThat(node.getProgram()).isNotNull();
    assertThat(node.getProgram().getBodyList().get(0).getExpressionStatement()).isNotNull();
  }

  private static byte[] getSerializedProtoData() throws IOException {
    // the clear version of serialized.proto is `packages/jsts/tests/parsers/fixtures/ast/base.js`
    // it was generated by writing to a file the serialized data in the test `packages/jsts/tests/parsers/ast.test.ts`
    File file = new File("src/test/resources/files/serialized.proto");
    return Files.readAllBytes(file.toPath());
  }

  private static byte[] concatArrays(byte[] arr1, byte[] arr2, byte[] arr3) throws IOException {
    ByteArrayOutputStream outputStream =  new ByteArrayOutputStream();
    outputStream.write(arr1);
    outputStream.write(arr2);
    outputStream.write(arr3);
    return outputStream.toByteArray();
  }

  private static byte[] buildPayload(String jsonData) throws IOException {
    return buildPayload(jsonData, null);
  }

  private static byte[] buildPayload(String jsonData, @Nullable byte[] protoData) throws IOException {
    var firstPart = "-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"json\"" +
      "\r\n" +
      "\r\n" +
      jsonData +
      "\r\n" +
      "-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: application/octet-stream; name=\"ast\"" +
      "\r\n" +
      "\r\n";
    protoData = protoData != null ? protoData : getSerializedProtoData();
    var lastPart = "\r\n" +
      "-----------------------------9051914041544843365972754266--" +
      "\r\n";
    return concatArrays(
      firstPart.getBytes(StandardCharsets.UTF_8),
      protoData,
      lastPart.getBytes(StandardCharsets.UTF_8)
    );
  }

  @Test
  void should_log_error_if_ast_is_invalid() throws Exception {
    ClassicHttpResponse mockResponse = mock(ClassicHttpResponse.class);
    HttpEntity mockEntity = mock(HttpEntity.class);
    when(mockEntity.getContentType()).thenReturn("multipart/form-data; boundary=---------------------------9051914041544843365972754266");
    var invalidAst = new byte[]{42};
    var body = buildPayload("{\"hello\":\"worlds\"}", invalidAst);
    when(mockEntity.getContent()).thenReturn(new ByteArrayInputStream(body));
    when(mockResponse.getEntity()).thenReturn(mockEntity);

    assertThat(parseFormData(mockResponse).ast()).isNull();
    assertThat(logTester.logs(Level.ERROR)).containsExactly(
      "Failed to deserialize Protobuf message: While parsing a protocol message, the input ended unexpectedly in the middle of a field.  " +
        "This could mean either that the input has been truncated or that an embedded message misreported its own length.");
  }

  @Test
  void should_throw_an_error_if_json_is_missing() throws Exception {
    ClassicHttpResponse mockResponse = mock(ClassicHttpResponse.class);
    HttpEntity mockEntity = mock(HttpEntity.class);
    when(mockEntity.getContentType()).thenReturn("multipart/form-data; boundary=---------------------------9051914041544843365972754266");
    var body = "-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"ast\"" +
      "\r\n" +
      "\r\n" +
      "plop" +
      "\r\n" +
      "-----------------------------9051914041544843365972754266--" +
      "\r\n";
    when(mockEntity.getContent()).thenReturn(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    when(mockResponse.getEntity()).thenReturn(mockEntity);

    assertThatThrownBy(() -> parseFormData(mockResponse))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Data missing from response");
  }

  @Test
  void should_throw_an_error_if_ast_is_missing() throws Exception {
    ClassicHttpResponse mockResponse = mock(ClassicHttpResponse.class);
    HttpEntity mockEntity = mock(HttpEntity.class);
    when(mockEntity.getContentType()).thenReturn("multipart/form-data; boundary=---------------------------9051914041544843365972754266");
    var body = "-----------------------------9051914041544843365972754266" +
      "\r\n" +
      "Content-Disposition: form-data; name=\"json\"" +
      "\r\n" +
      "\r\n" +
      "{\"hello\":\"worlds\"}" +
      "\r\n" +
      "-----------------------------9051914041544843365972754266--" +
      "\r\n";
    when(mockEntity.getContent()).thenReturn(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    when(mockResponse.getEntity()).thenReturn(mockEntity);
    assertThatThrownBy(() -> parseFormData(mockResponse))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Data missing from response");
  }
}
