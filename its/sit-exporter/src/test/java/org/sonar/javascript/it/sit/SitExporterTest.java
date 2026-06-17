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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;

class SitExporterTest {

  @TempDir
  Path tempDir;

  @Test
  void serializesIssueWithPrimaryLocationAndFlows() {
    var issue = new SitIssue(
      "src/main.js",
      "javascript:S1116",
      "Remove this empty statement.",
      3,
      new SitRange(3, 3, 2, 3),
      List.of(
        new SitFlow(
          "DATA",
          "path",
          List.of(new SitFlowLocation("\\src\\secondary.js", new SitRange(4, 4, 1, 5), "secondary"))
        )
      )
    );

    var json = JsonParser.parseString(issue.toJsonLine()).getAsJsonObject();

    assertThat(json.get("component_path").getAsString()).isEqualTo("src/main.js");
    assertThat(json.get("rule_key").getAsString()).isEqualTo("javascript:S1116");
    assertThat(json.get("message").getAsString()).isEqualTo("Remove this empty statement.");
    assertThat(json.get("line").getAsInt()).isEqualTo(3);
    assertThat(json.getAsJsonObject("range").get("start_line_offset").getAsInt()).isEqualTo(2);
    assertThat(
      json
        .getAsJsonArray("flows")
        .get(0)
        .getAsJsonObject()
        .getAsJsonArray("locations")
        .get(0)
        .getAsJsonObject()
        .get("component_path")
        .getAsString()
    ).isEqualTo("src/secondary.js");
  }

  @Test
  void serializesFileLevelIssueWithoutRange() {
    var issue = new SitIssue(
      null,
      "css:S125",
      "Remove this commented out code.",
      null,
      null,
      List.of()
    );

    var json = JsonParser.parseString(issue.toJsonLine()).getAsJsonObject();

    assertThat(json.get("component_path").isJsonNull()).isTrue();
    assertThat(json.get("line").isJsonNull()).isTrue();
    assertThat(json.get("range").isJsonNull()).isTrue();
    assertThat(json.getAsJsonArray("flows")).isEmpty();
  }

  @Test
  void copiesOnlySourcesReferencedByIssues() throws Exception {
    var projectDir = tempDir.resolve("project");
    var sourcesDir = tempDir.resolve("sources");
    Files.createDirectories(projectDir.resolve("src"));
    Files.writeString(projectDir.resolve("src/main.js"), ";\n", StandardCharsets.UTF_8);

    SitExporter.copySources(projectDir, sourcesDir, Set.of("src/main.js"));

    assertThat(sourcesDir.resolve("src/main.js")).hasContent(";\n");
  }

  @Test
  void rejectsSourcePathsEscapingProjectDirectory() {
    assertThatThrownBy(() ->
      SitExporter.copySources(tempDir, tempDir.resolve("sources"), Set.of("../outside.js"))
    )
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("escapes root");
  }

  @Test
  @EnabledIfSystemProperty(named = "sit.exporter.smoke", matches = "true")
  void smokeExportsCustomJstsWithS1116() throws Exception {
    var repoRoot = repoRoot();
    var outputDir = tempDir.resolve("sit-output");
    var rulesJson = tempDir.resolve("rules.json");
    Files.writeString(
      rulesJson,
      "[{\"repository\":\"javascript\",\"language\":\"js\",\"ruleKey\":\"S1116\"}]\n",
      StandardCharsets.UTF_8
    );

    var pluginJar = System.getProperty(
      "sit.exporter.pluginJar",
      "sonar-plugin/sonar-javascript-plugin/target/sonar-javascript-plugin-*-multi.jar"
    );

    SitExporter.run(
      SitExporter.Config.fromArgs(
        new String[] {
          "--repo-root",
          repoRoot.toString(),
          "--projects-json",
          "packages/ruling/projects.json",
          "--rules-json",
          rulesJson.toString(),
          "--output-dir",
          outputDir.toString(),
          "--plugin-jar",
          pluginJar,
          "--project-filter",
          "custom-jsts",
          "--commit",
          "smoke-test",
          "--timestamp",
          "2024-01-01T00:00:00Z",
        }
      )
    );

    var projectOutput = outputDir.resolve("custom-jsts");
    var metadata = JsonParser.parseString(
      Files.readString(projectOutput.resolve("metadata.json"), StandardCharsets.UTF_8)
    ).getAsJsonObject();
    var issueLines = Files.readAllLines(
      projectOutput.resolve("issues.jsonl"),
      StandardCharsets.UTF_8
    );

    assertThat(metadata.get("project_key").getAsString()).isEqualTo("custom-jsts");
    var ruleKeys = metadata.getAsJsonArray("rule_keys");
    assertThat(ruleKeys).hasSize(1);
    assertThat(ruleKeys.get(0).getAsString()).isEqualTo("javascript:S1116");
    assertThat(issueLines).isNotEmpty();
    assertThat(issueLines).allSatisfy(line ->
      assertThat(
        JsonParser.parseString(line).getAsJsonObject().get("rule_key").getAsString()
      ).isEqualTo("javascript:S1116")
    );
    assertThat(hasRegularFile(projectOutput.resolve("sources"))).isTrue();
  }

  private static Path repoRoot() throws IOException {
    var current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
    while (current != null) {
      if (Files.exists(current.resolve("packages/ruling/projects.json"))) {
        return current;
      }
      current = current.getParent();
    }
    throw new IOException("Could not locate SonarJS repository root from user.dir");
  }

  private static boolean hasRegularFile(Path directory) throws IOException {
    try (var paths = Files.walk(directory)) {
      return paths.anyMatch(Files::isRegularFile);
    }
  }
}
