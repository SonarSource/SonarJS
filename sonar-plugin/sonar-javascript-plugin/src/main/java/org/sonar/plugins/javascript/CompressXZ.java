/*
 * sonar-scanner-npm
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

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import org.tukaani.xz.LZMA2Options;
import org.tukaani.xz.XZOutputStream;

class CompressXZ {

  public static void main(String[] args) throws Exception {
    args =
      new String[] {
        "/Users/ilia.kebets/Dev/Sonar/SonarJS/sonar-plugin/sonar-javascript-plugin/target/node/node-v20.5.1-darwin-arm64/bin/node",
      };
    if (args.length == 0) {
      System.out.println("Please provide a filename to compress using XZ");
      System.exit(1);
    }
    var filename = args[0];
    var file = new File(filename);
    if (!file.exists()) {
      System.out.println("File " + filename + " does not exist.");
      System.exit(1);
    }
    try (InputStream is = new BufferedInputStream(new FileInputStream(filename));) {
      byte[] buf = new byte[8 * 1024 * 1024];
      int nextBytes;

      try (
        FileOutputStream outfile = new FileOutputStream(filename + ".xz");
        // TODO: set LZMA2Options arg to 9 for maximum space saving - maybe add this level as argv param
        XZOutputStream outxz = new XZOutputStream(outfile, new LZMA2Options(1));
      ) {
        while ((nextBytes = is.read(buf)) > -1) {
          System.out.println("read " + nextBytes + " bytes");
          outxz.write(buf, 0, nextBytes);
        }
        is.close();
      }
    }
  }
}
