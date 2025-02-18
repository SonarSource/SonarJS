/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

class JavaScriptFilePredicateTest {

  @TempDir
  public static Path baseDir;

  private static final String newLine = System.lineSeparator();

  @Test
  void testYamlPredicate() {
    var baseYamlFile =
      "".concat("apiVersion: apps/v1")
        .concat(newLine)
        .concat("kind: Deployment")
        .concat(newLine)
        .concat("metadata:")
        .concat(" name: ");

    DefaultFileSystem fs = new DefaultFileSystem(baseDir);
    fs.add(createInputFile(baseDir, "plain.yaml", baseYamlFile.concat("{{ .Values.count }}")));
    fs.add(
      createInputFile(baseDir, "single-quote.yaml", baseYamlFile.concat("'{{ .Values.count }}'"))
    );
    fs.add(
      createInputFile(baseDir, "double-quote.yaml", baseYamlFile.concat("\"{{ .Values.count }}\""))
    );
    fs.add(createInputFile(baseDir, "comment.yaml", baseYamlFile.concat("# {{ .Values.count }}")));
    fs.add(
      createInputFile(
        baseDir,
        "code-fresh.yaml",
        baseYamlFile.concat("custom-label: {{MY_CUSTOM_LABEL}}")
      )
    );

    FilePredicate predicate = JavaScriptFilePredicate.getYamlPredicate(fs);
    List<File> files = new ArrayList<>();
    fs.files(predicate).forEach(files::add);

    var filenames = files.stream().map(File::getName).toList();
    assertThat(filenames).containsExactlyInAnyOrder(
      "single-quote.yaml",
      "double-quote.yaml",
      "comment.yaml",
      "code-fresh.yaml"
    );
  }

  @Test
  void testJsTsPredicate() {
    var fs = new DefaultFileSystem(baseDir);
    var tsFile = TestInputFileBuilder.create("", "file.ts")
      .setLanguage(TypeScriptLanguage.KEY)
      .build();
    var jsFile = TestInputFileBuilder.create("", "file.js")
      .setLanguage(JavaScriptLanguage.KEY)
      .build();
    var f = TestInputFileBuilder.create("", "file.cpp").setLanguage("c").build();
    var predicate = JavaScriptFilePredicate.getJsTsPredicate(fs);
    assertThat(predicate.apply(jsFile)).isTrue();
    assertThat(predicate.apply(tsFile)).isTrue();
    assertThat(predicate.apply(f)).isFalse();
  }

  private static InputFile createInputFile(Path baseDir, String relativePath, String content) {
    return new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(baseDir)
      .setType(Type.MAIN)
      .setLanguage(getLanguage(relativePath))
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();
  }

  private static String getLanguage(String path) {
    String fileExtension = path.substring(path.indexOf("."));
    if (JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE.contains(fileExtension)) {
      return JavaScriptLanguage.KEY;
    } else if (TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE.contains(fileExtension)) {
      return TypeScriptLanguage.KEY;
    } else {
      return path.split("\\.")[1];
    }
  }
}
