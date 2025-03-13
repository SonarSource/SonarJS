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

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

@Mojo(name = "create-versions")
public class CreateVersionsMojo extends AbstractMojo {

  @Parameter(required = true)
  private String baseDirectory;

  @Parameter(required = true)
  private List<String> filenames;

  @Parameter(required = true)
  private String nodeVersion;

  @Override
  public void execute() {
    List<String> filenames = Collections.emptyList();

    try {
      this.deploy(
          this.filenames.stream()
            .map(filename -> Path.of(this.baseDirectory, filename).toAbsolutePath())
            .toList()
        );
    } catch (IOException e) {
      throw new IllegalStateException(
        "Error while creating versions for " + Arrays.toString(filenames.toArray()),
        e
      );
    }
  }

  protected void deploy(List<Path> filenames) throws IOException {
    for (var filePath : filenames) {
      if (!Files.exists(filePath)) {
        throw new FileNotFoundException("File " + filePath + " does not exist.");
      }

      var versionOutputFilePath = Path.of(filePath.getParent().toString(), "version.txt");

      this.getLog()
        .info(
          String.format("Deploying version \"%s\" to %s", this.nodeVersion, versionOutputFilePath)
        );

      Files.write(versionOutputFilePath, this.nodeVersion.getBytes());
    }
  }
}
