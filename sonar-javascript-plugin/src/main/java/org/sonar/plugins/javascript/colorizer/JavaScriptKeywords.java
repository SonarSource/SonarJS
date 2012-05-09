/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript.colorizer;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class JavaScriptKeywords {

  private static final Set<String> JAVASCRIPT_KEYWORDS = new HashSet<String>();

  static {
    Collections.addAll(JAVASCRIPT_KEYWORDS, "break", "case", "catch", "continue", "default", "delete", "do", "else", "finally", "for",
        "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with");
  }

  private JavaScriptKeywords() {
  }

  public static Set<String> get() {
    return Collections.unmodifiableSet(JAVASCRIPT_KEYWORDS);
  }
}
