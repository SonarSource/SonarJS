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

import java.nio.file.Files;
import java.nio.file.Path;
import org.tukaani.xz.LZMA2Options;
import org.tukaani.xz.XZOutputStream;

public class XZ {

  // TODO: set this to 9 for maximum space saving (it will be slower, so we keep it at 1 for development)
  private static final int COMPRESSION_LEVEL = 1;

  public static void main(String[] args) throws Exception {
    if (args.length == 0) {
      System.out.println("Please provide at least 1 filename to compress using XZ");
      System.exit(1);
    }
    for (var filename : args) {
      System.out.println("Compressing " + filename);
      var file = Path.of(filename);
      if (!Files.exists(file)) {
        System.out.println("File " + filename + " does not exist.");
        System.exit(1);
      }
      try (
        var is = Files.newInputStream(file);
        var outfile = Files.newOutputStream(Path.of(file + ".xz"));
        var outxz = new XZOutputStream(outfile, new LZMA2Options(COMPRESSION_LEVEL))
      ) {
        is.transferTo(outxz);
      }
    }
  }
}