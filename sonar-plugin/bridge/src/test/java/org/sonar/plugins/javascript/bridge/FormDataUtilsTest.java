package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.bridge.FormDataUtils.parseFormData;

import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import org.junit.jupiter.api.Test;

public class FormDataUtilsTest {

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
    assertThat(response.ast()).contains("plop");
    assertThat(response.json()).contains("{\"hello\":\"worlds\"}");
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
