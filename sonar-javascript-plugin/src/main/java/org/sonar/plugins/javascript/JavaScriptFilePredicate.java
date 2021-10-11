/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import java.io.IOException;
import java.util.function.Predicate;
import java.util.regex.Pattern;

import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile.Type;

public class JavaScriptFilePredicate {

  private static final String regex = "\\<script[.\\s]*lang=['\"]ts['\"][.\\s]*\\>";
  private static final Pattern pattern = Pattern.compile(regex);
  private static final Predicate<String> predicate = pattern.asPredicate();
  private static final FilePredicate hasScriptTagWithLangTS = file -> {
    try {
      return predicate.test(file.contents());
    } catch (IOException e) {
      return false;
    }
  };

  private JavaScriptFilePredicate() {
  }

  public static FilePredicate getJavaScriptPredicate(FileSystem fs) {
    return fs.predicates().and(
      fs.predicates().or(
        fs.predicates().and(
          fs.predicates().hasLanguage(JavaScriptLanguage.KEY),
          fs.predicates().not(fs.predicates().hasExtension("vue"))
        ),
        fs.predicates().and(
          fs.predicates().hasExtension("vue"),
          fs.predicates().not(hasScriptTagWithLangTS))));
  }

  public static FilePredicate getTypeScriptPredicate(FileSystem fs) {
    return fs.predicates().and(
      fs.predicates().or(
        fs.predicates().and(
          fs.predicates().hasLanguage(TypeScriptLanguage.KEY),
          fs.predicates().not(fs.predicates().hasExtension("vue"))
        ),
        fs.predicates().and(
          fs.predicates().hasExtension("vue"),
          hasScriptTagWithLangTS)));
  }
}
