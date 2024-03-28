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
package org.sonar.plugins.javascript.utils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.Logger;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;

class ProgressReportTest {

  @org.junit.jupiter.api.extension.RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void testSonarLogger() throws Exception {
    ProgressReport report = new ProgressReport(ProgressReportTest.class.getName(), 100);

    report.start(2, "foo.java");
    report.stop();

    assertThat(logTester.logs(LoggerLevel.INFO)).isNotEmpty();
  }

  @Test
  void testPlural() throws Exception {
    Logger logger = mock(Logger.class);

    ProgressReport report = new ProgressReport(
      ProgressReportTest.class.getName(),
      100,
      logger,
      "analyzed"
    );

    report.start(2, "foo1.java");

    // Wait for start message
    waitForMessage(logger);

    // Wait for at least one progress message
    waitForMessage(logger);

    report.stop();

    ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
    verify(logger, atLeast(3)).info(captor.capture());

    List<String> messages = captor.getAllValues();
    assertThat(messages).hasSizeGreaterThanOrEqualTo(3);
    assertThat(messages.get(0)).isEqualTo("2 source files to be analyzed");
    for (int i = 1; i < messages.size() - 1; i++) {
      assertThat(messages.get(i)).isEqualTo("0/2 files analyzed, current file: foo1.java");
    }
    assertThat(messages.get(messages.size() - 1))
      .isEqualTo("2/2" + " source files have been analyzed");
  }

  @Test
  void testSingular() throws Exception {
    Logger logger = mock(Logger.class);

    ProgressReport report = new ProgressReport(
      ProgressReportTest.class.getName(),
      100,
      logger,
      "analyzed"
    );

    report.start(1, "foo.java");

    // Wait for start message
    waitForMessage(logger);

    // Wait for at least one progress message
    waitForMessage(logger);

    report.stop();

    ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
    verify(logger, atLeast(3)).info(captor.capture());

    List<String> messages = captor.getAllValues();
    assertThat(messages).hasSizeGreaterThanOrEqualTo(3);
    assertThat(messages.get(0)).isEqualTo("1 source file to be analyzed");
    for (int i = 1; i < messages.size() - 1; i++) {
      assertThat(messages.get(i)).isEqualTo("0/1 files analyzed, current file: foo.java");
    }
    assertThat(messages.get(messages.size() - 1))
      .isEqualTo("1/1" + " source file has been analyzed");
  }

  @Test
  void testCancel() throws InterruptedException {
    Logger logger = mock(Logger.class);

    ProgressReport report = new ProgressReport(
      ProgressReport.class.getName(),
      100,
      logger,
      "analyzed"
    );
    report.start(1, "foo.java");

    // Wait for start message
    waitForMessage(logger);

    report.cancel();
  }

  @Test
  void testStopPreserveTheInterruptedFlag() throws InterruptedException {
    Logger logger = mock(Logger.class);

    ProgressReport report = new ProgressReport(
      ProgressReport.class.getName(),
      100,
      logger,
      "analyzed"
    );
    report.start(1, "foo.java");

    // Wait for start message
    waitForMessage(logger);

    AtomicBoolean interruptFlagPreserved = new AtomicBoolean(false);

    Thread t = new Thread(() -> {
      try {
        Thread.sleep(10000);
      } catch (InterruptedException e1) {
        Thread.currentThread().interrupt();
      }
      report.stop();
      try {
        Thread.sleep(10000);
      } catch (InterruptedException e) {
        interruptFlagPreserved.set(true);
      }
    });
    t.start();
    t.interrupt();
    t.join(1000);
    assertThat(interruptFlagPreserved.get()).isTrue();

    ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
    verify(logger, atLeast(1)).info(captor.capture());

    List<String> messages = captor.getAllValues();
    assertThat(messages).contains("1/1" + " source file has been analyzed");
  }

  @Test
  void interrupting_the_thread_should_never_create_a_deadlock() {
    ProgressReport report = new ProgressReport(ProgressReport.class.getName(), 500);

    long start = System.currentTimeMillis();
    report.start(0, "foo");
    report.stop();
    long end = System.currentTimeMillis();

    // stopping the report too soon could fail to interrupt the thread that was not yet alive,
    // and fail to set the proper state for Thread.interrupted()
    // this test ensures that the report does not loop once or is interrupted when stop() is
    // called just after start()
    assertThat(end - start).isLessThan(300);
  }

  @Test
  void interrupted_thread_should_exit_immediately() throws InterruptedException {
    ProgressReport report = new ProgressReport(ProgressReport.class.getName(), 500);
    AtomicLong time = new AtomicLong(10000);
    Thread selfInterruptedThread = new Thread(() -> {
      // set the thread as interrupted
      Thread.currentThread().interrupt();
      long start = System.currentTimeMillis();
      // execute run, while the thread is interrupted
      report.run();
      long end = System.currentTimeMillis();
      time.set(end - start);
    });
    selfInterruptedThread.start();
    selfInterruptedThread.join();
    assertThat(time.get()).isLessThan(300);
  }

  private static void waitForMessage(Logger logger) throws InterruptedException {
    synchronized (logger) {
      logger.wait();
    }
  }
}
