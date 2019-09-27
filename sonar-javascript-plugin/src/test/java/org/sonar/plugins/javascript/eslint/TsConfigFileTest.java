/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

public class TsConfigFileTest {

  @ClassRule
  public static TemporaryFolder temp = new TemporaryFolder();


  @Test
  public void should_include_directory() throws Exception {
    TsConfigFile.Model model = new TsConfigFile.Model();
    model.include = Arrays.asList("include_dir");
    Path basedir = temp.newFolder().toPath();
    Files.createDirectory(basedir.resolve("include_dir"));
    TsConfigFile tsConfigFile = new TsConfigFile("tsconfig.json", basedir, model);
    InputFile inputFile1 = TestInputFileBuilder.create(basedir.toString(), "include_dir/file1.ts").build();
    assertThat(tsConfigFile.test(inputFile1)).isTrue();
    InputFile inputFile2 = TestInputFileBuilder.create(basedir.toString(), "file2.ts").build();
    assertThat(tsConfigFile.test(inputFile2)).isFalse();
  }

  @Test
  public void should_exclude_directory() throws Exception {
    TsConfigFile.Model model = new TsConfigFile.Model();
    model.exclude = Arrays.asList("exclude_dir");
    Path basedir = temp.newFolder().toPath();
    Files.createDirectory(basedir.resolve("exclude_dir"));
    TsConfigFile tsConfigFile = new TsConfigFile("tsconfig.json", basedir, model);
    InputFile inputFile = TestInputFileBuilder.create(basedir.toString(), "exclude_dir/file1.ts").build();
    assertThat(tsConfigFile.test(inputFile)).isFalse();
  }

  @Test
  public void should_include_only_listed_files() throws Exception {
    TsConfigFile.Model model = new TsConfigFile.Model();
    model.files = Arrays.asList("file.ts");
    Path basedir = temp.newFolder().toPath();
    TsConfigFile tsConfigFile = new TsConfigFile("tsconfig.json", basedir, model);
    InputFile file = TestInputFileBuilder.create(basedir.toString(), "file.ts").build();
    InputFile other = TestInputFileBuilder.create(basedir.toString(), "other.ts").build();

    assertThat(tsConfigFile.test(file)).isTrue();
    assertThat(tsConfigFile.test(other)).isFalse();
  }

  @Test
  public void should_match_file_in_starstart() throws Exception {
    TsConfigFile.Model model = new TsConfigFile.Model();
    model.include = Arrays.asList("src/**/*");
    Path basedir = temp.newFolder().toPath();
    TsConfigFile tsConfigFile = new TsConfigFile("tsconfig.json", basedir, model);
    InputFile file1 = TestInputFileBuilder.create(basedir.toString(), "src/file1.ts").build();
    InputFile file2 = TestInputFileBuilder.create(basedir.toString(), "src/dir/file2.ts").build();

    assertThat(tsConfigFile.test(file1)).isTrue();
    assertThat(tsConfigFile.test(file2)).isTrue();
  }

  @Test
  public void should_load_tsconfig() throws Exception {
    Path tsconfig = writeTsConfig("{\n" +
      "  \"include\": [\"src/**/*\"]\n" +
      "}");
    TsConfigFile tsConfigFile = TsConfigFile.load(tsconfig.toString());
    assertThat(tsConfigFile.model.include).containsExactly("src/**/*");
    InputFile file1 = TestInputFileBuilder.create(tsconfig.getParent().toString(), "src/file1.ts").build();
    assertThat(tsConfigFile.test(file1)).isTrue();
  }

  @Test
  public void should_load_tsconfig_with_trailing_comma() throws Exception {
    // json from apollo-server project
    Path tsconfig = writeTsConfig("{\n" +
      "  \"extends\": \"../../tsconfig.base\",\n" +
      "  \"compilerOptions\": {\n" +
      "    \"rootDir\": \"./src\",\n" +
      "    \"outDir\": \"./dist\",\n" +
      "  },\n" +
      "  \"include\": [\"src/**/*\"],\n" +
      "  \"exclude\": [\"**/__tests__\", \"**/__mocks__\"],\n" +
      "  \"references\": [\n" +
      "    { \"path\": \"../apollo-server-core\" },\n" +
      "    { \"path\": \"../apollo-server-types\" },\n" +
      "  ]\n" +
      "}\n");
    TsConfigFile tsConfigFile = TsConfigFile.load(tsconfig.toString());
    // fails because of trailing comma not supported by Gson parser, see https://github.com/google/gson/issues/1446
    assertThat(tsConfigFile).isNull();
  }

  @Test
  public void should_return_files_by_tsconfig() throws Exception {
    Path tsconfig = writeTsConfig("{\n" +
      "  \"include\": [\"src/**/*\"]\n" +
      "}");
    InputFile file1 = TestInputFileBuilder.create(tsconfig.getParent().toString(), "src/file1.ts").build();
    Map<String, List<InputFile>> map = TsConfigFile.inputFilesByTsConfig(Arrays.asList(tsconfig.toString()), Arrays.asList(file1));
    assertThat(map).containsExactly(
      entry(tsconfig.toString(), Arrays.asList(file1))
    );
  }

  private static Path writeTsConfig(String json) throws IOException {
    Path tsconfig = temp.newFile().toPath();
    Files.write(tsconfig, json.getBytes(StandardCharsets.UTF_8));
    return tsconfig;
  }

}
