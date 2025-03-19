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
package domain;

public interface FileSystem {
  String resolve(String first, String... more);

  /**
   * Write the passed `content` into the file located at the passed `filePath`, creating intermediate directories in the process.
   *
   * @param filePath The absolute path of the file to write into
   * @param content The content to write into the file
   * @throws Exception
   */
  void write(String filePath, String content) throws Exception;
}
