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
import java.util.List;
import javax.annotation.Nullable;

public class CacheStrategy {

  private final String name;
  private final boolean analysisRequired;
  private final CacheWriter<List<String>, Void> cacheWriter;

  CacheStrategy(String name, boolean analysisRequired, CacheWriter<List<String>, Void> cacheWriter) {
    this.name = name;
    this.analysisRequired = analysisRequired;
    this.cacheWriter = cacheWriter;
  }

  String getName() {
    return name;
  }

  public boolean isAnalysisRequired() {
    return analysisRequired;
  }

  public void writeGeneratedFilesToCache(@Nullable List<String> generatedFiles) throws IOException {
    if (cacheWriter != null) {
      cacheWriter.writeCache(generatedFiles);
    }
  }

}
