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
package org.sonar.javascript.tree.symbols;

import com.google.common.collect.Sets;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.Test;

import static org.fest.assertions.Assertions.assertThat;

public class GlobalVariableNamesTest {

  @Test
  public void test_default_do_not_intersect() throws Exception {
    Set<String> defaultEnvironments = Sets.newHashSet(GlobalVariableNames.ENVIRONMENTS_DEFAULT_VALUE.split(",")).stream()
      .map(String::trim)
      .collect(Collectors.toSet());

    Set<String> defaultGlobals = Sets.newHashSet(GlobalVariableNames.GLOBALS_DEFAULT_VALUE.split(",")).stream()
      .map(String::trim)
      .collect(Collectors.toSet());

    Map<String, Set<String>> environments = GlobalVariableNames.environments();
    Set<String> allNamesFromAllEnvironments = environments.entrySet().stream()
      .filter(entry -> defaultEnvironments.contains(entry.getKey()))
      .map(Entry::getValue)
      .flatMap(Collection::stream)
      .collect(Collectors.toSet());

    Set<String> intersection = new HashSet<>(allNamesFromAllEnvironments);
    intersection.retainAll(defaultGlobals);

    assertThat(intersection).isEmpty();
  }
}
