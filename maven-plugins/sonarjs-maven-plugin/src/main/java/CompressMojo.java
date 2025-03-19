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
import org.tukaani.xz.LZMA2Options;
import org.tukaani.xz.XZOutputStream;

@Mojo(name = "compress")
public class CompressMojo extends AbstractMojo {

  @Parameter(required = true)
  private String baseDirectory;

  @Parameter(required = true)
  private List<String> filenames;

  @Parameter(required = true)
  private String targetDirectory;

  @Parameter(defaultValue = "9")
  private int compressionLevel;

  @Override
  public void execute() {
    List<String> filenames = Collections.emptyList();

    try {
      this.compress(
          this.filenames.stream()
            .map(filename -> Path.of(this.baseDirectory, filename).toAbsolutePath())
            .toList()
        );
    } catch (IOException e) {
      throw new IllegalStateException(
        "Error while compressing " + Arrays.toString(filenames.toArray()),
        e
      );
    }
  }

  protected void compress(List<Path> filenames) throws IOException {
    for (var file : filenames) {
      var outputFile = Path.of(
        this.targetDirectory,
        Path.of(this.baseDirectory).toAbsolutePath().relativize(file) + ".xz"
      );

      this.getLog().info("Compressing " + file + " to " + outputFile);

      if (!Files.exists(file)) {
        throw new FileNotFoundException(String.format("File %s does not exist.", file));
      }

      if (Files.exists(outputFile)) {
        this.getLog()
          .info(String.format("Skipping compression, file %s already exists.", outputFile));
        continue;
      }

      outputFile.toFile().getParentFile().mkdirs();

      try (
        var is = Files.newInputStream(file);
        var outfile = Files.newOutputStream(outputFile);
        var outxz = new XZOutputStream(outfile, new LZMA2Options(this.compressionLevel))
      ) {
        is.transferTo(outxz);
      }
    }
  }
}
