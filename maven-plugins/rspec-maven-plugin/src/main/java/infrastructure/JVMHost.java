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
package infrastructure;

import application.Host;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Paths;

public class JVMHost implements Host {

  public String resolve(String first, String... more) {
    return Paths.get(first, more).toString();
  }

  public void write(String filePath, String content) throws application.IOException {
    try {
      var file = new File(filePath);

      file.getParentFile().mkdirs();

      var writer = new FileWriter(file);

      writer.write(content);
      writer.close();
    } catch (IOException e) {
      throw new application.IOException();
    }
  }
}
