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
package org.sonar.plugins.javascript.standalone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

class StandaloneParserCliTest {

  @TempDir
  Path directory;

  @Test
  void writes_raw_protobuf_and_actual_producer_metadata() throws Exception {
    assumeTrue(
      Files.isRegularFile(
        Path.of(Node.class.getProtectionDomain().getCodeSource().getLocation().toURI())
      ),
      "The CLI requires the packaged bridge JAR's Maven version metadata"
    );
    Path source = directory.resolve("stub.js");
    Path ast = directory.resolve("stub.pb");
    Path metadata = directory.resolve("metadata.json");
    Files.writeString(source, "module.exports.run = function() { return 42; };");

    StandaloneParserCli.main(
      new String[] { source.toString(), ast.toString(), metadata.toString() }
    );

    var program = ESTreeFactory.from(Node.parseFrom(Files.readAllBytes(ast)), ESTree.Program.class);
    assertThat(program.body()).hasSize(1);
    assertThat(Files.readString(metadata))
      .contains("\"astFormat\":\"sonarjs-protobuf\"")
      .contains("\"sonarJsVersion\":\"" + StandaloneParserCli.producerVersion() + "\"");
    assertThat(StandaloneParserCli.producerVersion()).matches("[A-Za-z0-9][A-Za-z0-9._+-]*");
  }

  @Test
  void requires_source_ast_and_metadata_paths() {
    assertThatThrownBy(() -> StandaloneParserCli.main(new String[0]))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageStartingWith("Usage: StandaloneParserCli");
  }
}
