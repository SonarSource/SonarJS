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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileStatus;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileType;
import org.sonar.plugins.javascript.api.AnalysisMode;

class AnalyzeProjectMessagesTest {

  @Test
  void should_serialize_custom_js_rule_configuration_objects() {
    var rule = new EslintRule(
      "custom-rule",
      List.of(new ThresholdConfig(42)),
      List.of(InputFile.Type.MAIN),
      List.of(AnalysisMode.DEFAULT),
      List.of(),
      "js"
    );

    var configuration = AnalyzeProjectMessages.toProtoRule(rule).getConfigurations(0);

    assertThat(
      configuration.getStructValue().getFieldsOrThrow("threshold").getNumberValue()
    ).isEqualTo(42);
  }

  @Test
  void should_serialize_custom_css_rule_configuration_objects() {
    var rule = new StylelintRule(
      "custom-css-rule",
      List.of(true, new IgnoreFontFamiliesConfig(List.of("serif", "sans-serif")))
    );

    var configurations = AnalyzeProjectMessages.toProtoRule(rule).getConfigurationsList();

    assertThat(configurations.get(0).getBoolValue()).isTrue();
    assertThat(
      configurations
        .get(1)
        .getStructValue()
        .getFieldsOrThrow("ignoreFontFamilies")
        .getListValue()
        .getValuesList()
        .stream()
        .map(value -> value.getStringValue())
        .toList()
    ).containsExactly("serif", "sans-serif");
  }

  @Test
  void should_omit_null_fields_in_custom_rule_configuration_objects() {
    var rule = new EslintRule(
      "custom-rule",
      List.of(new NullableConfig("kept", null)),
      List.of(InputFile.Type.MAIN),
      List.of(AnalysisMode.DEFAULT),
      List.of(),
      "js"
    );

    var configuration = AnalyzeProjectMessages.toProtoRule(rule).getConfigurations(0);

    assertThat(configuration.getStructValue().getFieldsMap()).containsKey("included");
    assertThat(configuration.getStructValue().getFieldsMap()).doesNotContainKey("omitted");
  }

  @Test
  void should_default_null_file_metadata_to_unspecified() {
    var fileInput = AnalyzeProjectMessages.newProjectFileInput(null, null, null);

    assertThat(fileInput.getFileType()).isEqualTo(FileType.FILE_TYPE_UNSPECIFIED);
    assertThat(fileInput.getFileStatus()).isEqualTo(FileStatus.FILE_STATUS_UNSPECIFIED);
    assertThat(fileInput.hasFileContent()).isFalse();
  }

  private static final class ThresholdConfig {

    private final int threshold;

    private ThresholdConfig(int threshold) {
      this.threshold = threshold;
    }
  }

  private static final class IgnoreFontFamiliesConfig {

    private final List<String> ignoreFontFamilies;

    private IgnoreFontFamiliesConfig(List<String> ignoreFontFamilies) {
      this.ignoreFontFamilies = ignoreFontFamilies;
    }
  }

  private static final class NullableConfig {

    private final String included;
    private final String omitted;

    private NullableConfig(String included, String omitted) {
      this.included = included;
      this.omitted = omitted;
    }
  }
}
