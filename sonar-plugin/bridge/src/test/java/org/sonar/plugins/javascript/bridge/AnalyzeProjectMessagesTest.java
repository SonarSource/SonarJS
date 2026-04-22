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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.google.gson.JsonNull;
import com.google.gson.JsonParser;
import com.google.protobuf.NullValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
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
  void should_serialize_ts_rule_metadata() {
    var rule = new EslintRule(
      "custom-ts-rule",
      List.of(),
      List.of(InputFile.Type.TEST),
      List.of(AnalysisMode.SKIP_UNCHANGED),
      List.of(".d.ts"),
      "ts"
    );

    var configuration = AnalyzeProjectMessages.toProtoRule(rule);

    assertThat(configuration.getLanguage()).isEqualTo(
      org.sonar.plugins.javascript.analyzeproject.grpc.JsTsLanguage.JS_TS_LANGUAGE_TS
    );
    assertThat(configuration.getFileTypeTargetsList()).containsExactly(FileType.FILE_TYPE_TEST);
    assertThat(configuration.getAnalysisModesList()).containsExactly(
      org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED
    );
    assertThat(configuration.getBlacklistedExtensionsList()).containsExactly(".d.ts");
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

  @Test
  void should_serialize_non_default_file_metadata() {
    var fileInput = AnalyzeProjectMessages.newProjectFileInput(
      InputFile.Type.TEST,
      InputFile.Status.CHANGED,
      "content"
    );

    assertThat(fileInput.getFileType()).isEqualTo(FileType.FILE_TYPE_TEST);
    assertThat(fileInput.getFileStatus()).isEqualTo(FileStatus.FILE_STATUS_CHANGED);
    assertThat(fileInput.getFileContent()).isEqualTo("content");
  }

  @Test
  void should_build_project_configuration_with_overrides() {
    var configuration = new AnalysisConfiguration() {
      @Override
      public boolean isSonarLint() {
        return true;
      }

      @Override
      public boolean allowTsParserJsFiles() {
        return false;
      }

      @Override
      public AnalysisMode getAnalysisMode() {
        return AnalysisMode.SKIP_UNCHANGED;
      }

      @Override
      public boolean ignoreHeaderComments() {
        return false;
      }

      @Override
      public long getMaxFileSizeProperty() {
        return 2048L;
      }

      @Override
      public List<String> getEnvironments() {
        return List.of("browser");
      }

      @Override
      public List<String> getGlobals() {
        return List.of("window");
      }

      @Override
      public List<String> getTsExtensions() {
        return List.of(".ts");
      }

      @Override
      public List<String> getJsExtensions() {
        return List.of(".js");
      }

      @Override
      public List<String> getCssExtensions() {
        return List.of(".css");
      }

      @Override
      public List<String> getHtmlExtensions() {
        return List.of(".html");
      }

      @Override
      public List<String> getYamlExtensions() {
        return List.of(".yaml");
      }

      @Override
      public List<String> getCssAdditionalExtensions() {
        return List.of(".scss");
      }

      @Override
      public boolean shouldSendFileSuffixes() {
        return true;
      }

      @Override
      public Set<String> getTsConfigPaths() {
        return Set.of("tsconfig.json");
      }

      @Override
      public List<String> getJsTsExcludedPaths() {
        return List.of("generated/**");
      }

      @Override
      public boolean shouldDetectBundles() {
        return false;
      }

      @Override
      public boolean canAccessFileSystem() {
        return false;
      }

      @Override
      public boolean shouldCreateTSProgramForOrphanFiles() {
        return false;
      }

      @Override
      public boolean shouldDisableTypeChecking() {
        return true;
      }

      @Override
      public boolean shouldSkipNodeModuleLookupOutsideBaseDir() {
        return true;
      }

      @Override
      public String getEcmaScriptVersion() {
        return "2024";
      }

      @Override
      public List<String> getSources() {
        return List.of("src");
      }

      @Override
      public List<String> getInclusions() {
        return List.of("**/*.ts");
      }

      @Override
      public List<String> getExclusions() {
        return List.of("**/*.gen.ts");
      }

      @Override
      public List<String> getTests() {
        return List.of("tests");
      }

      @Override
      public List<String> getTestInclusions() {
        return List.of("**/*.spec.ts");
      }

      @Override
      public List<String> getTestExclusions() {
        return List.of("**/*.snap.ts");
      }
    };

    var proto = AnalyzeProjectMessages.newProjectConfigurationBuilder(
      "/base",
      configuration
    ).build();

    assertThat(proto.getBaseDir()).isEqualTo("/base");
    assertThat(proto.getSonarlint()).isTrue();
    assertThat(proto.getAllowTsParserJsFiles()).isFalse();
    assertThat(proto.getAnalysisMode()).isEqualTo(
      org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED
    );
    assertThat(proto.getIgnoreHeaderComments()).isFalse();
    assertThat(proto.getMaxFileSize()).isEqualTo(2048L);
    assertThat(proto.getEnvironments().getValuesList()).containsExactly("browser");
    assertThat(proto.getGlobals().getValuesList()).containsExactly("window");
    assertThat(proto.getTsSuffixes().getValuesList()).containsExactly(".ts");
    assertThat(proto.getJsSuffixes().getValuesList()).containsExactly(".js");
    assertThat(proto.getCssSuffixes().getValuesList()).containsExactly(".css");
    assertThat(proto.getHtmlSuffixes().getValuesList()).containsExactly(".html");
    assertThat(proto.getYamlSuffixes().getValuesList()).containsExactly(".yaml");
    assertThat(proto.getCssAdditionalSuffixes().getValuesList()).containsExactly(".scss");
    assertThat(proto.getTsConfigPathsList()).containsExactly("tsconfig.json");
    assertThat(proto.getJsTsExclusions().getValuesList()).containsExactly("generated/**");
    assertThat(proto.getSourcesList()).containsExactly("src");
    assertThat(proto.getInclusionsList()).containsExactly("**/*.ts");
    assertThat(proto.getExclusionsList()).containsExactly("**/*.gen.ts");
    assertThat(proto.getTestsList()).containsExactly("tests");
    assertThat(proto.getTestInclusionsList()).containsExactly("**/*.spec.ts");
    assertThat(proto.getTestExclusionsList()).containsExactly("**/*.snap.ts");
    assertThat(proto.getDetectBundles()).isFalse();
    assertThat(proto.getCanAccessFileSystem()).isFalse();
    assertThat(proto.getCreateTsProgramForOrphanFiles()).isFalse();
    assertThat(proto.getDisableTypeChecking()).isTrue();
    assertThat(proto.getSkipNodeModuleLookupOutsideBaseDir()).isTrue();
    assertThat(proto.getEcmaScriptVersion()).isEqualTo("2024");
  }

  @Test
  void should_leave_optional_project_configuration_fields_unset_when_defaults_apply() {
    var proto = AnalyzeProjectMessages.newProjectConfigurationBuilder(
      "/base",
      new AnalysisConfiguration() {}
    ).build();

    assertThat(proto.getBaseDir()).isEqualTo("/base");
    assertThat(proto.getAnalysisMode()).isEqualTo(
      org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisMode.ANALYSIS_MODE_DEFAULT
    );
    assertThat(proto.getDetectBundles()).isTrue();
    assertThat(proto.getCanAccessFileSystem()).isTrue();
    assertThat(proto.getCreateTsProgramForOrphanFiles()).isTrue();
    assertThat(proto.getDisableTypeChecking()).isFalse();
    assertThat(proto.hasEcmaScriptVersion()).isFalse();
  }

  @Test
  void should_serialize_direct_and_nested_values() {
    var nested = new LinkedHashMap<String, Object>();
    nested.put("enabled", true);
    nested.put("threshold", 7);
    nested.put("items", List.of("first", 2));
    nested.put("letters", new String[] { "a", "b" });

    assertThat(AnalyzeProjectMessages.toValue(null).getNullValue()).isEqualTo(NullValue.NULL_VALUE);
    assertThat(AnalyzeProjectMessages.toValue(true).getBoolValue()).isTrue();
    assertThat(AnalyzeProjectMessages.toValue(42).getNumberValue()).isEqualTo(42);
    assertThat(AnalyzeProjectMessages.toValue("strict").getStringValue()).isEqualTo("strict");
    assertThat(AnalyzeProjectMessages.toValue('x').getStringValue()).isEqualTo("x");
    assertThat(AnalyzeProjectMessages.toValue(AnalysisMode.DEFAULT).getStringValue()).isEqualTo(
      "DEFAULT"
    );
    assertThat(
      AnalyzeProjectMessages.toValue(nested)
        .getStructValue()
        .getFieldsOrThrow("items")
        .getListValue()
        .getValuesList()
    )
      .extracting(value ->
        value.getKindCase() == com.google.protobuf.Value.KindCase.STRING_VALUE
          ? value.getStringValue()
          : value.getNumberValue()
      )
      .containsExactly("first", 2.0);
    assertThat(
      AnalyzeProjectMessages.toValue(nested)
        .getStructValue()
        .getFieldsOrThrow("letters")
        .getListValue()
        .getValuesList()
        .stream()
        .map(value -> value.getStringValue())
        .toList()
    ).containsExactly("a", "b");
  }

  @Test
  void should_serialize_json_elements() {
    var json = JsonParser.parseString("{\"mode\":\"strict\",\"items\":[true,null,1]}");

    var value = AnalyzeProjectMessages.toValue(json);

    assertThat(value.getStructValue().getFieldsOrThrow("mode").getStringValue()).isEqualTo(
      "strict"
    );
    assertThat(
      value.getStructValue().getFieldsOrThrow("items").getListValue().getValues(0).getBoolValue()
    ).isTrue();
    assertThat(
      value.getStructValue().getFieldsOrThrow("items").getListValue().getValues(1).getNullValue()
    ).isEqualTo(NullValue.NULL_VALUE);
    assertThat(AnalyzeProjectMessages.toValue(JsonNull.INSTANCE).getNullValue()).isEqualTo(
      NullValue.NULL_VALUE
    );
  }

  @Test
  void should_reject_cyclic_rule_configuration_values() {
    var cyclic = new LinkedHashMap<String, Object>();
    cyclic.put("self", cyclic);

    assertThatThrownBy(() -> AnalyzeProjectMessages.toValue(cyclic))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("Unsupported cyclic rule configuration value");
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
