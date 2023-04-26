/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.JavaScriptFilePredicate.isTypeScriptFile;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
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
  void testJavaScriptPredicate() throws IOException {
    DefaultFileSystem fs = new DefaultFileSystem(baseDir);
    fs.add(createInputFile(baseDir, "a.js"));
    fs.add(createInputFile(baseDir, "b.ts"));
    fs.add(createInputFile(baseDir, "c.vue"));
    fs.add(
      createInputFile(
        baseDir,
        "d.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("<script>foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "e.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("<script lang=\"js\">foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "f.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("   <script  ")
          .concat(newLine)
          .concat("   lang='js'   ")
          .concat(newLine)
          .concat(">foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "g.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("   <script  ")
          .concat(newLine)
          .concat("   lang=\"ts\"   ")
          .concat(newLine)
          .concat(">foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "h.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("   <script setup awesomeAttribute  AnnoYingAtTribute42-666='à$'>foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(createInputFile(baseDir, "i.java"));
    fs.add(createInputFile(baseDir, "j.jsx"));
    fs.add(createInputFile(baseDir, "k.tsx"));

    FilePredicate predicate = JavaScriptFilePredicate.getJsTsPredicate(fs);
    var files = new ArrayList<InputFile>();
    fs.inputFiles(predicate).forEach(files::add);

    List<String> filenames = files
      .stream()
      .filter(f -> !isTypeScriptFile(f))
      .map(InputFile::filename)
      .collect(Collectors.toList());
    assertThat(filenames)
      .containsExactlyInAnyOrder("a.js", "c.vue", "d.vue", "e.vue", "f.vue", "h.vue", "j.jsx");
  }

  @Test
  void testTypeScriptPredicate() throws IOException {
    DefaultFileSystem fs = new DefaultFileSystem(baseDir);
    fs.add(createInputFile(baseDir, "a.js"));
    fs.add(createInputFile(baseDir, "b.ts"));
    fs.add(createInputFile(baseDir, "c.vue"));
    fs.add(
      createInputFile(
        baseDir,
        "d.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("   <script  ")
          .concat(newLine)
          .concat("   lang=\"js\"   ")
          .concat(newLine)
          .concat(">foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "e.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("   <script  ")
          .concat(newLine)
          .concat("   lang=\"ts\"   ")
          .concat(newLine)
          .concat(">foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "f.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat(
            "   <script someAttribute=9000  setup lang='ts' otherAttribute=\"hello\"   wazzzAAAA='waaaaaaa'  >foo()</script>"
          )
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(
      createInputFile(
        baseDir,
        "g.vue",
        "".concat("<template><p>Hello, world!</p></template>")
          .concat(newLine)
          .concat("   <scriptlang='ts'>foo()</script>")
          .concat(newLine)
          .concat("<style>p{}</style>")
      )
    );
    fs.add(createInputFile(baseDir, "h.java"));
    fs.add(createInputFile(baseDir, "i.jsx"));
    fs.add(createInputFile(baseDir, "j.tsx"));

    FilePredicate predicate = JavaScriptFilePredicate.getJsTsPredicate(fs);
    var files = new ArrayList<InputFile>();
    fs.inputFiles(predicate).forEach(files::add);

    List<String> filenames = files
      .stream()
      .filter(JavaScriptFilePredicate::isTypeScriptFile)
      .map(InputFile::filename)
      .collect(Collectors.toList());
    assertThat(filenames).containsExactlyInAnyOrder("b.ts", "e.vue", "f.vue", "j.tsx");
  }

  @Test
  void testYamlPredicate() throws IOException {
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

    List<String> filenames = files.stream().map(File::getName).collect(Collectors.toList());
    assertThat(filenames)
      .containsExactlyInAnyOrder(
        "single-quote.yaml",
        "double-quote.yaml",
        "comment.yaml",
        "code-fresh.yaml"
      );
  }

  @Test
  void testIsTypeScriptFile() {
    var tsFile = TestInputFileBuilder
      .create("", "file.ts")
      .setLanguage(TypeScriptLanguage.KEY)
      .build();
    assertThat(isTypeScriptFile(tsFile)).isTrue();
    var jsFile = TestInputFileBuilder
      .create("", "file.js")
      .setLanguage(JavaScriptLanguage.KEY)
      .build();
    assertThat(isTypeScriptFile(jsFile)).isFalse();
    var vueFile = TestInputFileBuilder
      .create("", "file.vue")
      .setLanguage(JavaScriptLanguage.KEY)
      .build();
    assertThat(isTypeScriptFile(vueFile)).isFalse();
    var tsVueFile = TestInputFileBuilder
      .create("", "file.vue")
      .setLanguage(JavaScriptLanguage.KEY)
      .setContents("<script lang='ts'>")
      .build();
    assertThat(isTypeScriptFile(tsVueFile)).isTrue();
  }

  @Test
  void testJsTsPredicate() {
    var fs = new DefaultFileSystem(baseDir);
    var tsFile = TestInputFileBuilder
      .create("", "file.ts")
      .setLanguage(TypeScriptLanguage.KEY)
      .build();
    var jsFile = TestInputFileBuilder
      .create("", "file.js")
      .setLanguage(JavaScriptLanguage.KEY)
      .build();
    var f = TestInputFileBuilder.create("", "file.cpp").setLanguage("c").build();
    var predicate = JavaScriptFilePredicate.getJsTsPredicate(fs);
    assertThat(predicate.apply(jsFile)).isTrue();
    assertThat(predicate.apply(tsFile)).isTrue();
    assertThat(predicate.apply(f)).isFalse();
  }

  private static InputFile createInputFile(Path baseDir, String relativePath) {
    return createInputFile(baseDir, relativePath, "");
  }

  private static InputFile createInputFile(Path baseDir, String relativePath, String content) {
    InputFile file = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(baseDir)
      .setType(Type.MAIN)
      .setLanguage(getLanguage(relativePath))
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();
    return file;
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
