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
package org.sonarsource.javascript;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import org.tukaani.xz.LZMA2Options;
import org.tukaani.xz.XZOutputStream;

public class XZ {

  private static final int DEFAULT_COMPRESSION_LEVEL = 9;

  public static void main(String[] args) {
    if (args.length == 0) {
      System.out.println("Please provide at least 1 filename to compress using XZ");
      System.exit(1);
    }
    try {
      compress(args);
    } catch (IOException e) {
      System.out.println(
        "Error while compressing files " + Arrays.toString(args) + ": " + e.getMessage()
      );
      System.out.println(e.getStackTrace());
    }
  }

  /**
   * Compress the provided filenames with the `DEFAULT_COMPRESSION_LEVEL`
   *
   * @param filenames
   * @throws IOException
   */
  public static void compress(String[] filenames) throws IOException {
    for (var filename : filenames) {
      System.out.println("Compressing " + filename);
      var file = Path.of(filename);
      if (!Files.exists(file)) {
        throw new FileNotFoundException("File " + filename + " does not exist.");
      }
      var outputFile = Path.of(file + ".xz");
      if (Files.exists(outputFile)) {
        System.out.println("Skipping compression. File " + outputFile + " already exists.");
        continue;
      }
      try (
        var is = Files.newInputStream(file);
        var outfile = Files.newOutputStream(outputFile);
        var outxz = new XZOutputStream(outfile, new LZMA2Options(DEFAULT_COMPRESSION_LEVEL))
      ) {
        is.transferTo(outxz);
        Files.delete(file);
      }
    }
  }
}
