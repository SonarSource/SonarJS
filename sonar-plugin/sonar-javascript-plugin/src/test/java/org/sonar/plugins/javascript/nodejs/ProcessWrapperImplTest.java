/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.nodejs;

import static java.util.Collections.emptyMap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ProcessWrapperImplTest {

  @Test
  void test_interrupt() {
    assertThat(Thread.currentThread().isInterrupted()).isFalse();
    new ProcessWrapperImpl().interrupt();
    assertThat(Thread.currentThread().isInterrupted()).isTrue();
  }

  @Test
  void test_getenv() {
    String path = new ProcessWrapperImpl().getenv("PATH");
    assertThat(path).isNotEmpty();
  }

  @Test
  void test_destroyforcibly() throws Exception {
    ProcessWrapperImpl processWrapper = new ProcessWrapperImpl();
    Process ping = processWrapper.startProcess(
      Arrays.asList("ping", "127.0.0.1"),
      emptyMap(),
      System.out::println,
      System.out::println
    );
    processWrapper.destroyForcibly(ping);
    await().until(() -> !ping.isAlive());
    assertThat(ping.isAlive()).isFalse();
  }
}
