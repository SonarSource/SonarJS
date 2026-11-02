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

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import java.util.jar.JarFile;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

/** Offline producer for persisted bridge ASTs; the consumer does not need Node.js. */
public final class StandaloneParserCli {

  private StandaloneParserCli() {}

  public static void main(String[] args) {
    if (args.length != 3) {
      throw new IllegalArgumentException(
        "Usage: StandaloneParserCli <source.js> <output.pb> <metadata.json>"
      );
    }
    try {
      writeArtifacts(Path.of(args[0]), Path.of(args[1]), Path.of(args[2]));
    } catch (IOException error) {
      throw new UncheckedIOException(error);
    }
  }

  private static void writeArtifacts(Path source, Path ast, Path metadata) throws IOException {
    String version = producerVersion();
    byte[] protobuf;
    try (var parser = new StandaloneParser()) {
      protobuf = parser
        .parseToProtobuf(Files.readString(source), source.getFileName().toString())
        .toByteArray();
    }
    Files.write(ast, protobuf);
    Files.writeString(
      metadata,
      "{\"astFormat\":\"sonarjs-protobuf\",\"sonarJsVersion\":\"" + version + "\"}\n",
      StandardCharsets.UTF_8
    );
  }

  static String producerVersion() throws IOException {
    // Use the JAR that actually provided the schema, not a supplied version.
    var location = Node.class.getProtectionDomain().getCodeSource().getLocation();
    try (var jar = new JarFile(Path.of(URI.create(location.toExternalForm())).toFile())) {
      var entry = jar.getJarEntry(
        "META-INF/maven/org.sonarsource.javascript/bridge/pom.properties"
      );
      if (entry == null) {
        throw new IOException(
          "Cannot identify the SonarJS bridge version: Maven metadata is missing"
        );
      }
      var properties = new Properties();
      try (var input = jar.getInputStream(entry)) {
        properties.load(input);
      }
      String version = properties.getProperty("version", "");
      if (!version.matches("[A-Za-z0-9][A-Za-z0-9._+-]*")) {
        throw new IOException("Cannot identify the SonarJS bridge version: invalid Maven metadata");
      }
      return version;
    }
  }
}
