/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import java.util.concurrent.atomic.AtomicBoolean;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

public class ProgressReport implements Runnable {

  private final long period;
  private final Logger logger;
  private long count;
  private long currentFileNumber = -1;
  private String currentFilename;
  private final Thread thread;
  private final String adjective;
  private final AtomicBoolean success = new AtomicBoolean(false);

  /**
   * The report loop can not rely only on Thread.interrupted() to end, according to
   * interrupted() javadoc, a thread interruption can be ignored because a thread was
   * not alive at the time of the interrupt. This could happen if stop() is being called
   * before ProgressReport's thread becomes alive.
   * So this boolean flag ensures that ProgressReport never enter an infinite loop when
   * Thread.interrupted() failed to be set to true.
   */
  private final AtomicBoolean interrupted = new AtomicBoolean();

  public ProgressReport(String threadName, long period, Logger logger, String adjective) {
    interrupted.set(false);
    this.period = period;
    this.logger = logger;
    this.adjective = adjective;
    thread = new Thread(this);
    thread.setName(threadName);
    thread.setDaemon(true);
  }

  public ProgressReport(String threadName, long period, String adjective) {
    this(threadName, period, Loggers.get(ProgressReport.class), adjective);
  }

  public ProgressReport(String threadName, long period) {
    this(threadName, period, "analyzed");
  }

  @Override
  public void run() {
    log(count + " source " + pluralizeFile(count) + " to be " + adjective);
    while (!(interrupted.get() || Thread.currentThread().isInterrupted())) {
      try {
        Thread.sleep(period);
        log(
          currentFileNumber +
          "/" +
          count +
          " " +
          pluralizeFile(currentFileNumber) +
          " " +
          adjective +
          ", current file: " +
          currentFilename
        );
      } catch (InterruptedException e) {
        interrupted.set(true);
        thread.interrupt();
        break;
      }
    }
    if (success.get()) {
      log(
        count +
        "/" +
        count +
        " source " +
        pluralizeFile(count) +
        " " +
        pluralizeHas(count) +
        " been " +
        adjective
      );
    }
  }

  private static String pluralizeFile(long count) {
    if (count == 1L) {
      return "file";
    }
    return "files";
  }

  private static String pluralizeHas(long count) {
    if (count == 1L) {
      return "has";
    }
    return "have";
  }

  public synchronized void start(long count, String currentFilename) {
    this.count = count;
    nextFile(currentFilename);
    thread.start();
  }

  public synchronized void nextFile(String currentFilename) {
    currentFileNumber++;
    this.currentFilename = currentFilename;
  }

  public synchronized void stop() {
    success.set(true);
    interrupted.set(true);
    thread.interrupt();
    join();
  }

  public synchronized void cancel() {
    interrupted.set(true);
    thread.interrupt();
    join();
  }

  private void join() {
    try {
      thread.join();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private void log(String message) {
    synchronized (logger) {
      logger.info(message);
      logger.notifyAll();
    }
  }
}
