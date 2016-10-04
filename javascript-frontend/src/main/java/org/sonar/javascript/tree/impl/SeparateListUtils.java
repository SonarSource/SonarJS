/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.tree.impl;

import java.util.LinkedList;
import java.util.List;
import org.sonar.plugins.javascript.api.tree.Tree;

public class SeparateListUtils {
  
  private SeparateListUtils() {
  }

  /**
   * Returns a new list containing the present (in the sense of Optional#isPresent) elements in <code>list</code>.
   */
  public static <T extends Tree> List<T> presentsOf(List<com.sonar.sslr.api.typed.Optional<T>> list) {
    List<T> newList = new LinkedList<>();
    for (com.sonar.sslr.api.typed.Optional<T> element : list) {
      if (element.isPresent()) {
        newList.add(element.get());
      }
    }
    return newList;
  }

}
