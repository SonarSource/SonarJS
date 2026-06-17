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
package org.sonar.javascript.it.sit;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import com.sonarsource.scanner.integrationtester.dsl.ActiveRule;
import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.RuleKey;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerResultSuccess;
import com.sonarsource.scanner.integrationtester.dsl.SonarProjectContext;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.FileIssue;
import com.sonarsource.scanner.integrationtester.dsl.issue.Flow;
import com.sonarsource.scanner.integrationtester.dsl.issue.FlowLocation;
import com.sonarsource.scanner.integrationtester.dsl.issue.Issue;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRange;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class SitExporter {

  private static final Logger LOG = LoggerFactory.getLogger(SitExporter.class);
  private static final Gson GSON = new Gson();
  private static final String DEFAULT_PROJECTS_JSON = "packages/ruling/projects.json";
  private static final String DEFAULT_OUTPUT_DIR = "build/sit-export";
  private static final String DEFAULT_PLUGIN_JAR =
    "sonar-plugin/sonar-javascript-plugin/target/sonar-javascript-plugin-*-multi.jar";
  private static final String DEFAULT_EXCLUSIONS = "**/.*,**/*.d.ts";
  private static final String DEFAULT_RUNTIME_VERSION = "LATEST_RELEASE";
  private static final String JAVASCRIPT_REPOSITORY = "javascript";
  private static final Set<String> UNSUPPORTED_TEMPLATE_RULES = Set.of("S124");

  private SitExporter() {}

  public static void main(String[] args) {
    int exitCode = runCli(args);
    if (exitCode != 0) {
      System.exit(exitCode);
    }
  }

  private static int runCli(String[] args) {
    try {
      run(Config.fromArgs(args));
      return 0;
    } catch (Exception e) {
      String message = e.getMessage();
      LOG.error(message == null || message.isBlank() ? e.toString() : message);
      return 1;
    }
  }

  static void run(Config config) throws IOException {
    List<RulingProject> projects = loadProjects(config.projectsJson());
    List<RuleSelection> rules = loadRules(config.rulesJson());
    if (!config.projectFilter().isEmpty()) {
      projects = projects
        .stream()
        .filter(project -> config.projectFilter().contains(project.name()))
        .toList();
    }

    if (projects.isEmpty()) {
      throw new IllegalArgumentException("No ruling projects selected");
    }

    List<RuleSelection> supportedRules = rules
      .stream()
      .filter(rule -> !UNSUPPORTED_TEMPLATE_RULES.contains(rule.ruleKey()))
      .toList();
    List<String> unsupportedRules = rules
      .stream()
      .filter(rule -> UNSUPPORTED_TEMPLATE_RULES.contains(rule.ruleKey()))
      .map(RuleSelection::qualifiedKey)
      .distinct()
      .sorted()
      .toList();

    Files.createDirectories(config.outputDir());
    SonarServerContext serverContext = supportedRules.isEmpty()
      ? null
      : buildServerContext(config.pluginJar(), supportedRules);
    for (RulingProject project : projects) {
      exportProject(config, project, supportedRules, unsupportedRules, serverContext);
    }
  }

  private static void exportProject(
    Config config,
    RulingProject project,
    List<RuleSelection> rules,
    List<String> unsupportedRules,
    @Nullable SonarServerContext serverContext
  ) throws IOException {
    Path projectDir = project
      .resolveSourceDirectory(config.repoRoot())
      .toAbsolutePath()
      .normalize();
    if (!Files.isDirectory(projectDir)) {
      throw new IllegalArgumentException("Project directory does not exist: " + projectDir);
    }

    Path projectOutputDir = config.outputDir().resolve(project.name()).toAbsolutePath().normalize();
    Files.createDirectories(projectOutputDir);

    List<SitIssue> issues = List.of();
    if (!rules.isEmpty()) {
      Path projectWorkDir = config.workDir().resolve(project.name());
      Files.createDirectories(projectWorkDir);
      var scannerInput = buildScannerInput(project, projectDir, projectWorkDir);
      var result = ScannerRunner.run(
        Objects.requireNonNull(serverContext),
        scannerInput.withVerbose().build(),
        ScannerRunnerConfig.defaults()
      );
      if (result.exitCode() != 0) {
        throw new IllegalStateException(
          "Scanner failed for " + project.name() + " with exit code " + result.exitCode()
        );
      }
      issues = ((ScannerResultSuccess) result).scannerOutputReader()
        .getProject()
        .getAllIssues()
        .stream()
        .sorted(issueComparator())
        .map(SitIssue::from)
        .toList();
    }

    Files.write(
      projectOutputDir.resolve("issues.jsonl"),
      issues.stream().map(SitIssue::toJsonLine).toList(),
      StandardCharsets.UTF_8
    );
    writeMetadata(
      projectOutputDir.resolve("metadata.json"),
      config,
      project,
      rules,
      unsupportedRules
    );
    copySources(projectDir, projectOutputDir.resolve("sources"), collectComponentPaths(issues));
  }

  private static SonarServerContext buildServerContext(Path pluginJar, List<RuleSelection> rules) {
    var builder = SonarServerContext.builder()
      .withProduct(SonarServerContext.Product.SERVER)
      .withEngineVersion(resolveEngineVersion())
      .withPlugin(resolvePluginLocation(pluginJar))
      .withPlugin(
        MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", DEFAULT_RUNTIME_VERSION)
      )
      .withPlugin(
        MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", DEFAULT_RUNTIME_VERSION)
      )
      .withLanguage("js", "JAVASCRIPT", "sonar.javascript.file.suffixes", ".js,.jsx,.cjs,.mjs,.vue")
      .withLanguage("ts", "TYPESCRIPT", "sonar.typescript.file.suffixes", ".ts,.tsx,.cts,.mts")
      .withLanguage("css", "CSS", "sonar.css.file.suffixes", ".css,.less,.scss,.sass")
      .withLanguage("web", "WEB", "sonar.html.file.suffixes", ".html")
      .withLanguage("yaml", "YAML", "sonar.javascript.yaml.file.suffixes", ".yaml,.yml");

    return builder
      .withProjectContext(
        SonarProjectContext.builder()
          .withActiveRules(rules.stream().map(SitExporter::activeRule).toList())
          .build()
      )
      .build();
  }

  private static EngineVersion.Version resolveEngineVersion() {
    String runtimeVersion = System.getProperty("sonar.runtimeVersion", DEFAULT_RUNTIME_VERSION);
    if ("DEV".equals(runtimeVersion)) {
      return EngineVersion.latestMasterBuild();
    }
    return EngineVersion.latestRelease();
  }

  private static FileLocation resolvePluginLocation(Path pluginJar) {
    String fileName = pluginJar.getFileName().toString();
    if (fileName.contains("*")) {
      return FileLocation.byWildcardMavenFilename(pluginJar.getParent().toFile(), fileName);
    }
    return FileLocation.of(pluginJar.toFile());
  }

  private static ActiveRule activeRule(RuleSelection rule) {
    var builder = ActiveRule.builder()
      .withKey(RuleKey.of(rule.repository(), rule.ruleKey()))
      .withName(rule.ruleKey())
      .withLanguageKey(rule.language())
      .withSeverity(ActiveRule.Severity.INFO);

    for (Map.Entry<String, String> entry : parameterOverrides(rule).entrySet()) {
      builder = builder.withParameter(entry.getKey(), entry.getValue());
    }
    return builder.build();
  }

  private static Map<String, String> parameterOverrides(RuleSelection rule) {
    if (JAVASCRIPT_REPOSITORY.equals(rule.repository()) && "S1451".equals(rule.ruleKey())) {
      return Map.of(
        "headerFormat",
        "// Copyright 20\\d\\d The Closure Library Authors. All Rights Reserved.",
        "isRegularExpression",
        "true"
      );
    }
    if ("typescript".equals(rule.repository()) && "S1451".equals(rule.ruleKey())) {
      return Map.of("headerFormat", "//.*", "isRegularExpression", "true");
    }
    if (JAVASCRIPT_REPOSITORY.equals(rule.repository()) && "S1192".equals(rule.ruleKey())) {
      return Map.of("threshold", "4");
    }
    return Map.of();
  }

  private static ScannerInput.Builder buildScannerInput(
    RulingProject project,
    Path projectDir,
    Path workDir
  ) {
    var builder = ScannerInput.create(project.name(), projectDir)
      .withWorkDir(workDir)
      .withOrganizationKey("test-organization")
      .withScannerProperty("sonar.projectName", project.name())
      .withScannerProperty("sonar.projectVersion", "1")
      .withScannerProperty("sonar.sources", ".")
      .withScannerProperty("sonar.sourceEncoding", "utf-8")
      .withScannerProperty("sonar.exclusions", exclusions(project))
      .withScannerProperty("sonar.javascript.node.maxspace", "4096")
      .withScannerProperty("sonar.javascript.maxFileSize", "4000")
      .withScannerProperty("sonar.cpd.exclusions", "**/*")
      .withScannerProperty("sonar.scm.disabled", "true")
      .withScannerProperty("sonar.sca.disabled", "true")
      .withScannerProperty("sonar.sensor.cache.enable", "false")
      .withScannerProperty("sonar.internal.analysis.skipNodeModuleLookupOutsideBaseDir", "true")
      .withScannerProperty("sonar.internal.analysis.failFast", "true");

    if (!isBlank(project.testDir())) {
      builder = builder.withScannerProperty("sonar.tests", project.testDir());
    }
    return builder;
  }

  private static String exclusions(RulingProject project) {
    List<String> values = new ArrayList<>();
    values.add(DEFAULT_EXCLUSIONS);
    if (!isBlank(project.exclusions())) {
      values.add(project.exclusions());
    }
    if (!isBlank(project.testDir())) {
      values.add(project.testDir() + "/**/*");
    }
    return String.join(",", values);
  }

  private static List<RulingProject> loadProjects(Path projectsJson) throws IOException {
    Type type = new TypeToken<List<RulingProject>>() {}.getType();
    return GSON.fromJson(Files.readString(projectsJson, StandardCharsets.UTF_8), type);
  }

  private static List<RuleSelection> loadRules(Path rulesJson) throws IOException {
    JsonArray array = GSON.fromJson(
      Files.readString(rulesJson, StandardCharsets.UTF_8),
      JsonArray.class
    );
    List<RuleSelection> rules = new ArrayList<>();
    for (JsonElement element : array) {
      JsonObject object = element.getAsJsonObject();
      String language = requiredString(object, "language").toLowerCase(Locale.ROOT);
      String repository = optionalString(object, "repository").orElseGet(() ->
        repositoryForLanguage(language)
      );
      String rawRuleKey = optionalString(object, "ruleKey")
        .or(() -> optionalString(object, "rule_key"))
        .or(() -> optionalString(object, "rule_id"))
        .orElseThrow(() ->
          new IllegalArgumentException("Rule entry is missing ruleKey: " + object)
        );
      String ruleKey = rawRuleKey.contains(":")
        ? rawRuleKey.substring(rawRuleKey.indexOf(':') + 1)
        : rawRuleKey;
      rules.add(new RuleSelection(repository, language, ruleKey.toUpperCase(Locale.ROOT)));
    }
    return rules
      .stream()
      .distinct()
      .sorted(Comparator.comparing(RuleSelection::qualifiedKey))
      .toList();
  }

  private static Optional<String> optionalString(JsonObject object, String name) {
    if (!object.has(name) || object.get(name).isJsonNull()) {
      return Optional.empty();
    }
    return Optional.of(object.get(name).getAsString());
  }

  private static String requiredString(JsonObject object, String name) {
    return optionalString(object, name).orElseThrow(() ->
      new IllegalArgumentException("Rule entry is missing " + name + ": " + object)
    );
  }

  private static String repositoryForLanguage(String language) {
    return switch (language) {
      case "js" -> JAVASCRIPT_REPOSITORY;
      case "ts" -> "typescript";
      case "css" -> "css";
      default -> throw new IllegalArgumentException("Unsupported language: " + language);
    };
  }

  private static Comparator<Issue> issueComparator() {
    return Comparator.comparing(
      SitExporter::componentPathOrNull,
      Comparator.nullsLast(String::compareTo)
    )
      .thenComparing(Issue::ruleKey, Comparator.nullsLast(String::compareTo))
      .thenComparingInt(SitExporter::lineOrZero)
      .thenComparingInt(SitExporter::startLineOffsetOrMinusOne);
  }

  @Nullable
  private static String componentPathOrNull(Issue issue) {
    return issue instanceof FileIssue fileIssue ? fileIssue.componentPath() : null;
  }

  private static int lineOrZero(Issue issue) {
    return issue instanceof TextRangeIssue textRangeIssue ? textRangeIssue.line() : 0;
  }

  private static int startLineOffsetOrMinusOne(Issue issue) {
    if (issue instanceof TextRangeIssue textRangeIssue && textRangeIssue.range() != null) {
      return textRangeIssue.range().startLineOffset();
    }
    return -1;
  }

  private static Set<String> collectComponentPaths(List<SitIssue> issues) {
    Set<String> componentPaths = new TreeSet<>();
    for (SitIssue issue : issues) {
      addComponentPath(componentPaths, issue.componentPath());
      for (SitFlow flow : issue.flows()) {
        for (SitFlowLocation location : flow.locations()) {
          addComponentPath(componentPaths, location.componentPath());
        }
      }
    }
    return componentPaths;
  }

  private static void addComponentPath(
    Set<String> componentPaths,
    @Nullable String rawComponentPath
  ) {
    normalizeComponentPath(rawComponentPath).ifPresent(componentPaths::add);
  }

  static void copySources(Path projectDir, Path sourcesDir, Set<String> componentPaths)
    throws IOException {
    Path normalizedProjectDir = projectDir.toAbsolutePath().normalize();
    Path normalizedSourcesDir = sourcesDir.toAbsolutePath().normalize();
    Files.createDirectories(normalizedSourcesDir);
    for (String componentPath : componentPaths) {
      Path sourcePath = normalizedProjectDir.resolve(componentPath).normalize();
      ensureWithin(normalizedProjectDir, sourcePath, "source");
      Path targetPath = normalizedSourcesDir.resolve(componentPath).normalize();
      ensureWithin(normalizedSourcesDir, targetPath, "target");
      Files.createDirectories(Objects.requireNonNull(targetPath.getParent()));
      Files.copy(
        sourcePath,
        targetPath,
        StandardCopyOption.REPLACE_EXISTING,
        StandardCopyOption.COPY_ATTRIBUTES
      );
    }
  }

  private static void writeMetadata(
    Path metadataFile,
    Config config,
    RulingProject project,
    List<RuleSelection> rules,
    List<String> unsupportedRules
  ) throws IOException {
    var metadata = new LinkedHashMap<String, Object>();
    metadata.put("project_key", project.name());
    metadata.put("repo_url", config.repoUrl());
    metadata.put("commit", config.commit());
    metadata.put("language", "js-ts-css");
    metadata.put("rule_keys", rules.stream().map(RuleSelection::qualifiedKey).sorted().toList());
    metadata.put("unsupported_rules", unsupportedRules);
    metadata.put("analysis_timestamp", config.timestamp());
    Files.writeString(metadataFile, GSON.toJson(metadata) + "\n", StandardCharsets.UTF_8);
  }

  static Optional<String> normalizeComponentPath(@Nullable String componentPath) {
    if (componentPath == null || componentPath.isBlank()) {
      return Optional.empty();
    }
    String normalized = componentPath.replace("\\", "/");
    while (normalized.startsWith("/")) {
      normalized = normalized.substring(1);
    }
    return normalized.isBlank() ? Optional.empty() : Optional.of(normalized);
  }

  private static void ensureWithin(Path root, Path path, String label) {
    if (!path.startsWith(root)) {
      throw new IllegalArgumentException("Resolved " + label + " path escapes root: " + path);
    }
  }

  private static boolean isBlank(@Nullable String value) {
    return value == null || value.isBlank();
  }

  record Config(
    Path repoRoot,
    Path projectsJson,
    Path rulesJson,
    Path outputDir,
    Path workDir,
    Path pluginJar,
    Set<String> projectFilter,
    String repoUrl,
    String commit,
    String timestamp
  ) {
    static Config fromArgs(String[] args) {
      Map<String, String> parsed = parseArgs(args);
      Path repoRoot = Path.of(parsed.getOrDefault("--repo-root", ".")).toAbsolutePath().normalize();
      Path outputDir = resolveAgainst(
        repoRoot,
        parsed.getOrDefault("--output-dir", DEFAULT_OUTPUT_DIR)
      );
      return new Config(
        repoRoot,
        resolveAgainst(repoRoot, parsed.getOrDefault("--projects-json", DEFAULT_PROJECTS_JSON)),
        resolveAgainst(repoRoot, requiredArg(parsed, "--rules-json")),
        outputDir,
        outputDir.resolve(".work"),
        resolveAgainst(repoRoot, parsed.getOrDefault("--plugin-jar", DEFAULT_PLUGIN_JAR)),
        parseFilter(parsed.get("--project-filter")),
        parsed.getOrDefault("--repo-url", defaultRepoUrl()),
        parsed.getOrDefault("--commit", System.getenv().getOrDefault("GITHUB_SHA", "unknown")),
        parsed.getOrDefault("--timestamp", Instant.now().toString())
      );
    }

    private static Map<String, String> parseArgs(String[] args) {
      Map<String, String> parsed = new LinkedHashMap<>();
      for (int i = 0; i < args.length; i += 2) {
        if (i + 1 >= args.length) {
          throw new IllegalArgumentException("Missing value for " + args[i]);
        }
        parsed.put(args[i], args[i + 1]);
      }
      return parsed;
    }

    private static String requiredArg(Map<String, String> parsed, String name) {
      String value = parsed.get(name);
      if (value == null || value.isBlank()) {
        throw new IllegalArgumentException("Missing required argument " + name);
      }
      return value;
    }

    private static Path resolveAgainst(Path repoRoot, String rawPath) {
      Path path = Path.of(rawPath);
      return path.isAbsolute() ? path.normalize() : repoRoot.resolve(path).normalize();
    }

    private static Set<String> parseFilter(@Nullable String rawFilter) {
      if (rawFilter == null || rawFilter.isBlank()) {
        return Set.of();
      }
      return Arrays.stream(rawFilter.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static String defaultRepoUrl() {
      String serverUrl = System.getenv().getOrDefault("GITHUB_SERVER_URL", "");
      String repository = System.getenv().getOrDefault("GITHUB_REPOSITORY", "");
      if (!serverUrl.isBlank() && !repository.isBlank()) {
        return trimTrailingSlashes(serverUrl) + "/" + repository;
      }
      return "unknown";
    }

    private static String trimTrailingSlashes(String value) {
      int end = value.length();
      while (end > 0 && value.charAt(end - 1) == '/') {
        end--;
      }
      return value.substring(0, end);
    }
  }
}

record RulingProject(
  String name,
  @Nullable String folder,
  @Nullable String testDir,
  @Nullable String exclusions
) {
  private static final String DEFAULT_FOLDER_PREFIX = "projects/";

  Path resolveSourceDirectory(Path repoRoot) {
    String projectFolder = folder == null ? (DEFAULT_FOLDER_PREFIX + name) : folder;
    return repoRoot.resolve("its/sources").resolve(projectFolder);
  }
}

record RuleSelection(String repository, String language, String ruleKey) {
  String qualifiedKey() {
    return repository + ":" + ruleKey;
  }
}

record SitRange(int startLine, int endLine, int startLineOffset, int endLineOffset) {
  static SitRange from(TextRange range) {
    return new SitRange(
      range.startLine(),
      range.endLine(),
      range.startLineOffset(),
      range.endLineOffset()
    );
  }

  String toJson() {
    return (
      "{" +
      "\"start_line\":" +
      startLine +
      ",\"end_line\":" +
      endLine +
      ",\"start_line_offset\":" +
      startLineOffset +
      ",\"end_line_offset\":" +
      endLineOffset +
      "}"
    );
  }
}

record SitFlowLocation(
  @Nullable String componentPath,
  @Nullable SitRange range,
  @Nullable String message
) {
  SitFlowLocation {
    componentPath = SitExporter.normalizeComponentPath(componentPath).orElse(null);
  }

  static SitFlowLocation from(FlowLocation location) {
    return new SitFlowLocation(
      location.componentPath(),
      location.range() == null ? null : SitRange.from(location.range()),
      location.message()
    );
  }

  String toJson() {
    return (
      "{" +
      "\"component_path\":" +
      Json.stringOrNull(componentPath) +
      ",\"range\":" +
      Json.objectOrNull(range == null ? null : range.toJson()) +
      ",\"message\":" +
      Json.stringOrNull(message) +
      "}"
    );
  }
}

record SitFlow(
  @Nullable String type,
  @Nullable String description,
  List<SitFlowLocation> locations
) {
  static SitFlow from(Flow flow) {
    String type = flow.type() == null ? null : flow.type().name();
    List<SitFlowLocation> locations =
      flow.locations() == null
        ? List.of()
        : flow.locations().stream().map(SitFlowLocation::from).toList();
    return new SitFlow(type, flow.description(), locations);
  }

  String toJson() {
    return (
      "{" +
      "\"type\":" +
      Json.stringOrNull(type) +
      ",\"description\":" +
      Json.stringOrNull(description) +
      ",\"locations\":" +
      locations.stream().map(SitFlowLocation::toJson).collect(Collectors.joining(",", "[", "]")) +
      "}"
    );
  }
}

record SitIssue(
  @Nullable String componentPath,
  String ruleKey,
  String message,
  @Nullable Integer line,
  @Nullable SitRange range,
  List<SitFlow> flows
) {
  SitIssue {
    componentPath = SitExporter.normalizeComponentPath(componentPath).orElse(null);
  }

  static SitIssue from(Issue issue) {
    FileIssue fileIssue = issue instanceof FileIssue typed ? typed : null;
    TextRangeIssue textRangeIssue = issue instanceof TextRangeIssue typed ? typed : null;
    TextRange textRange = textRangeIssue == null ? null : textRangeIssue.range();
    return new SitIssue(
      fileIssue == null ? null : fileIssue.componentPath(),
      issue.ruleKey(),
      issue.message(),
      textRangeIssue == null ? null : textRangeIssue.line(),
      textRange == null ? null : SitRange.from(textRange),
      issue.flows() == null ? List.of() : issue.flows().stream().map(SitFlow::from).toList()
    );
  }

  String toJsonLine() {
    return (
      "{" +
      "\"component_path\":" +
      Json.stringOrNull(componentPath) +
      ",\"rule_key\":" +
      Json.string(ruleKey) +
      ",\"message\":" +
      Json.string(message) +
      ",\"line\":" +
      (line == null ? "null" : line) +
      ",\"range\":" +
      Json.objectOrNull(range == null ? null : range.toJson()) +
      ",\"flows\":" +
      flows.stream().map(SitFlow::toJson).collect(Collectors.joining(",", "[", "]")) +
      "}"
    );
  }
}

final class Json {

  private static final Gson GSON = new Gson();

  private Json() {}

  static String string(String value) {
    return GSON.toJson(value);
  }

  static String stringOrNull(@Nullable String value) {
    return value == null ? "null" : string(value);
  }

  static String objectOrNull(@Nullable String json) {
    return json == null ? "null" : json;
  }
}
