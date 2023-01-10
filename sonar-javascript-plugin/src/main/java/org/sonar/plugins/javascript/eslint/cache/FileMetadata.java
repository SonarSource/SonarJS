/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.eslint.cache;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import org.sonar.api.batch.fs.InputFile;

public class FileMetadata {

  private long size;

  private byte[] hash;

  FileMetadata(long size, byte[] hash) {
    this.size = size;
    this.hash = hash;
  }

  static FileMetadata from(InputFile file) throws IOException {
    return new FileMetadata(fileSize(file), computeHash(file));
  }

  boolean compareTo(InputFile file) throws IOException {
    return size == fileSize(file) && Arrays.equals(hash, computeHash(file));
  }

  static int fileSize(InputFile file) throws IOException {
    return file.contents().getBytes(file.charset()).length;
  }

  static byte[] computeHash(InputFile file) throws IOException {
    try {
      var digest = MessageDigest.getInstance("SHA-256");
      var bytes = file.contents().getBytes(file.charset());
      return digest.digest(bytes);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
