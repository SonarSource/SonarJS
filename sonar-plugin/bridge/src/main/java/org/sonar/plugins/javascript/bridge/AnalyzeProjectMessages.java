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

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;
import com.google.protobuf.ListValue;
import com.google.protobuf.NullValue;
import com.google.protobuf.Struct;
import com.google.protobuf.Value;
import java.lang.reflect.Array;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisMode;
import org.sonar.plugins.javascript.analyzeproject.grpc.CssRule;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileStatus;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileType;
import org.sonar.plugins.javascript.analyzeproject.grpc.JsTsLanguage;
import org.sonar.plugins.javascript.analyzeproject.grpc.JsTsRule;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectConfiguration;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectFileInput;
import org.sonar.plugins.javascript.analyzeproject.grpc.StringList;

public final class AnalyzeProjectMessages {

  private static final Gson GSON = new Gson();

  private AnalyzeProjectMessages() {}

  public static ProjectConfiguration.Builder newProjectConfigurationBuilder(
    String baseDir,
    AnalysisConfiguration analysisConfiguration
  ) {
    var builder = ProjectConfiguration.newBuilder()
      .setBaseDir(baseDir)
      .setSonarlint(analysisConfiguration.isSonarLint())
      .setAllowTsParserJsFiles(analysisConfiguration.allowTsParserJsFiles())
      .setAnalysisMode(toProtoAnalysisMode(analysisConfiguration.getAnalysisMode()))
      .setIgnoreHeaderComments(analysisConfiguration.ignoreHeaderComments())
      .setMaxFileSize(analysisConfiguration.getMaxFileSizeProperty())
      .setEnvironments(stringList(analysisConfiguration.getEnvironments()))
      .setGlobals(stringList(analysisConfiguration.getGlobals()))
      .addAllTsConfigPaths(analysisConfiguration.getTsConfigPaths())
      .setJsTsExclusions(stringList(analysisConfiguration.getJsTsExcludedPaths()))
      .addAllSources(analysisConfiguration.getSources())
      .addAllInclusions(analysisConfiguration.getInclusions())
      .addAllExclusions(analysisConfiguration.getExclusions())
      .addAllTests(analysisConfiguration.getTests())
      .addAllTestInclusions(analysisConfiguration.getTestInclusions())
      .addAllTestExclusions(analysisConfiguration.getTestExclusions())
      .setDetectBundles(analysisConfiguration.shouldDetectBundles())
      .setCanAccessFileSystem(analysisConfiguration.canAccessFileSystem())
      .setCreateTsProgramForOrphanFiles(analysisConfiguration.shouldCreateTSProgramForOrphanFiles())
      .setDisableTypeChecking(analysisConfiguration.shouldDisableTypeChecking())
      .setSkipNodeModuleLookupOutsideBaseDir(
        analysisConfiguration.shouldSkipNodeModuleLookupOutsideBaseDir()
      );

    if (analysisConfiguration.shouldSendFileSuffixes()) {
      builder
        .setTsSuffixes(stringList(analysisConfiguration.getTsExtensions()))
        .setJsSuffixes(stringList(analysisConfiguration.getJsExtensions()))
        .setCssSuffixes(stringList(analysisConfiguration.getCssExtensions()))
        .setHtmlSuffixes(stringList(analysisConfiguration.getHtmlExtensions()))
        .setYamlSuffixes(stringList(analysisConfiguration.getYamlExtensions()))
        .setCssAdditionalSuffixes(stringList(analysisConfiguration.getCssAdditionalExtensions()));
    }

    var ecmaScriptVersion = analysisConfiguration.getEcmaScriptVersion();
    if (ecmaScriptVersion != null) {
      builder.setEcmaScriptVersion(ecmaScriptVersion);
    }

    return builder;
  }

  public static ProjectFileInput newProjectFileInput(
    @Nullable InputFile.Type fileType,
    @Nullable InputFile.Status fileStatus,
    @Nullable String fileContent
  ) {
    var builder = ProjectFileInput.newBuilder()
      .setFileType(toProtoFileType(fileType))
      .setFileStatus(toProtoFileStatus(fileStatus));
    if (fileContent != null) {
      builder.setFileContent(fileContent);
    }
    return builder.build();
  }

  public static JsTsRule toProtoRule(EslintRule rule) {
    return JsTsRule.newBuilder()
      .setKey(rule.getKey())
      .addAllConfigurations(
        rule.getConfigurations().stream().map(AnalyzeProjectMessages::toValue).toList()
      )
      .addAllFileTypeTargets(
        rule.fileTypeTargets.stream().map(AnalyzeProjectMessages::toProtoFileType).toList()
      )
      .setLanguage(toProtoJsTsLanguage(rule.language))
      .addAllAnalysisModes(
        rule.getAnalysisModes().stream().map(AnalyzeProjectMessages::toProtoAnalysisMode).toList()
      )
      .addAllBlacklistedExtensions(rule.blacklistedExtensions)
      .build();
  }

  public static CssRule toProtoRule(StylelintRule rule) {
    return CssRule.newBuilder()
      .setKey(rule.key)
      .addAllConfigurations(
        rule.configurations.stream().map(AnalyzeProjectMessages::toValue).toList()
      )
      .build();
  }

  public static StringList stringList(List<String> values) {
    return StringList.newBuilder().addAllValues(values).build();
  }

  private static FileType toProtoFileType(String fileType) {
    return switch (fileType) {
      case "MAIN" -> FileType.FILE_TYPE_MAIN;
      case "TEST" -> FileType.FILE_TYPE_TEST;
      default -> throw new IllegalArgumentException("Unsupported file type: " + fileType);
    };
  }

  public static FileType toProtoFileType(@Nullable InputFile.Type fileType) {
    if (fileType == null) {
      return FileType.FILE_TYPE_UNSPECIFIED;
    }
    return toProtoFileType(fileType.name());
  }

  public static FileStatus toProtoFileStatus(@Nullable InputFile.Status fileStatus) {
    if (fileStatus == null) {
      return FileStatus.FILE_STATUS_UNSPECIFIED;
    }
    return switch (fileStatus) {
      case SAME -> FileStatus.FILE_STATUS_SAME;
      case CHANGED -> FileStatus.FILE_STATUS_CHANGED;
      case ADDED -> FileStatus.FILE_STATUS_ADDED;
      default -> FileStatus.FILE_STATUS_UNSPECIFIED;
    };
  }

  public static AnalysisMode toProtoAnalysisMode(
    org.sonar.plugins.javascript.api.AnalysisMode analysisMode
  ) {
    return switch (analysisMode) {
      case DEFAULT -> AnalysisMode.ANALYSIS_MODE_DEFAULT;
      case SKIP_UNCHANGED -> AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED;
    };
  }

  private static JsTsLanguage toProtoJsTsLanguage(String language) {
    return switch (language) {
      case "js" -> JsTsLanguage.JS_TS_LANGUAGE_JS;
      case "ts" -> JsTsLanguage.JS_TS_LANGUAGE_TS;
      default -> throw new IllegalArgumentException("Unsupported JS/TS language: " + language);
    };
  }

  public static Value toValue(@Nullable Object input) {
    return toValue(input, Collections.newSetFromMap(new IdentityHashMap<>()));
  }

  private static Value toValue(@Nullable Object input, Set<Object> visited) {
    if (input == null) {
      return nullValue();
    }
    var directValue = toDirectValue(input);
    if (directValue != null) {
      return directValue;
    }
    if (!visited.add(input)) {
      throw cyclicRuleConfigurationValue(input, null);
    }
    try {
      return toStructuredValue(input, visited);
    } catch (StackOverflowError e) {
      throw cyclicRuleConfigurationValue(input, e);
    } catch (RuntimeException e) {
      if (isRuleConfigurationValueException(e)) {
        throw e;
      }
      throw unsupportedRuleConfigurationValue(input, e);
    } finally {
      visited.remove(input);
    }
  }

  private static Value toStructuredValue(Object input, Set<Object> visited) {
    if (input instanceof Map<?, ?> mapValue) {
      return toValue(mapValue, visited);
    }
    if (input instanceof Iterable<?> iterableValue) {
      return toValue(iterableValue, visited);
    }
    if (input.getClass().isArray()) {
      return toValueFromArray(input, visited);
    }
    return toValue(GSON.toJsonTree(input));
  }

  @Nullable
  private static Value toDirectValue(Object input) {
    if (input instanceof JsonElement jsonElement) {
      return toValue(jsonElement);
    }
    if (input instanceof Boolean booleanValue) {
      return Value.newBuilder().setBoolValue(booleanValue).build();
    }
    if (input instanceof Number numberValue) {
      return Value.newBuilder().setNumberValue(numberValue.doubleValue()).build();
    }
    if (input instanceof String stringValue) {
      return Value.newBuilder().setStringValue(stringValue).build();
    }
    if (input instanceof Character characterValue) {
      return Value.newBuilder().setStringValue(characterValue.toString()).build();
    }
    if (input instanceof Enum<?> enumValue) {
      return Value.newBuilder().setStringValue(enumValue.name()).build();
    }
    return null;
  }

  private static Value toValue(Map<?, ?> mapValue, Set<Object> visited) {
    var struct = Struct.newBuilder();
    for (var entry : mapValue.entrySet()) {
      struct.putFields(String.valueOf(entry.getKey()), toValue(entry.getValue(), visited));
    }
    return Value.newBuilder().setStructValue(struct).build();
  }

  private static Value toValue(Iterable<?> iterableValue, Set<Object> visited) {
    var listValue = ListValue.newBuilder();
    for (var item : iterableValue) {
      listValue.addValues(toValue(item, visited));
    }
    return Value.newBuilder().setListValue(listValue).build();
  }

  private static Value toValueFromArray(Object input, Set<Object> visited) {
    var listValue = ListValue.newBuilder();
    var size = Array.getLength(input);
    for (int i = 0; i < size; i++) {
      listValue.addValues(toValue(Array.get(input, i), visited));
    }
    return Value.newBuilder().setListValue(listValue).build();
  }

  private static IllegalArgumentException cyclicRuleConfigurationValue(
    Object input,
    @Nullable Throwable cause
  ) {
    return new IllegalArgumentException(
      "Unsupported cyclic rule configuration value: " + input.getClass(),
      cause
    );
  }

  private static IllegalArgumentException unsupportedRuleConfigurationValue(
    Object input,
    RuntimeException cause
  ) {
    return new IllegalArgumentException(
      "Unsupported rule configuration value: " + input.getClass(),
      cause
    );
  }

  private static boolean isRuleConfigurationValueException(RuntimeException exception) {
    return (
      exception instanceof IllegalArgumentException &&
      exception.getMessage() != null &&
      (exception.getMessage().startsWith("Unsupported cyclic rule configuration value: ") ||
        exception.getMessage().startsWith("Unsupported rule configuration value: "))
    );
  }

  private static Value toValue(@Nullable JsonElement jsonElement) {
    if (jsonElement == null || jsonElement.isJsonNull()) {
      return nullValue();
    }
    if (jsonElement.isJsonArray()) {
      var listValue = ListValue.newBuilder();
      for (var item : jsonElement.getAsJsonArray()) {
        listValue.addValues(toValue(item));
      }
      return Value.newBuilder().setListValue(listValue).build();
    }
    if (jsonElement.isJsonObject()) {
      var struct = Struct.newBuilder();
      for (var entry : jsonElement.getAsJsonObject().entrySet()) {
        struct.putFields(entry.getKey(), toValue(entry.getValue()));
      }
      return Value.newBuilder().setStructValue(struct).build();
    }
    return toValue(jsonElement.getAsJsonPrimitive());
  }

  private static Value toValue(JsonPrimitive jsonPrimitive) {
    if (jsonPrimitive.isBoolean()) {
      return Value.newBuilder().setBoolValue(jsonPrimitive.getAsBoolean()).build();
    }
    if (jsonPrimitive.isString()) {
      return Value.newBuilder().setStringValue(jsonPrimitive.getAsString()).build();
    }
    return Value.newBuilder().setNumberValue(jsonPrimitive.getAsNumber().doubleValue()).build();
  }

  private static Value nullValue() {
    return Value.newBuilder().setNullValue(NullValue.NULL_VALUE).build();
  }
}
