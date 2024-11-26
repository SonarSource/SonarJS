/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis.cache;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import org.sonar.api.batch.fs.InputFile;

public class FileMetadata {

  private final long size;

  private final byte[] hash;

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
