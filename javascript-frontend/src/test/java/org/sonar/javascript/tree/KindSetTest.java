/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree;

import org.junit.Test;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;

public class KindSetTest {

  @Test
  public void enumsSize() {
    assertThat(KindSet.ASSIGNMENT_KINDS.getSubKinds().size()).as("Number of subkinds in ASSIGNMENT_KINDS").isEqualTo(13);
    assertThat(KindSet.FUNCTION_KINDS.getSubKinds().size()).as("Number of subkinds in FUNCTION_KINDS").isEqualTo(9);
    assertThat(KindSet.INC_DEC_KINDS.getSubKinds().size()).as("Number of subkinds in INC_DEC_KINDS").isEqualTo(4);
  }

  @Test
  public void enumContents() {
    assertThat(KindSet.FUNCTION_KINDS.contains(Tree.Kind.FUNCTION_DECLARATION)).as("FUNCTION_KINDS contains FUNCTION_DECLARATION").isTrue();
    assertThat(KindSet.FUNCTION_KINDS.contains(Tree.Kind.CLASS_DECLARATION)).as("FUNCTION_KINDS contains CLASS_DECLARATION").isFalse();
    assertThat(KindSet.FUNCTION_KINDS.contains(KindSet.FUNCTION_KINDS)).as("FUNCTION_KINDS contains itself").isTrue();
  }

}
