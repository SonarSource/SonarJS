/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
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
package org.sonar.javascript;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;

public class ProgressReport implements Runnable {

  private final long period;
  private final Logger logger;
  private int files;
  private int count;
  private File currentFile;
  private final Thread thread;

  public ProgressReport(String threadName, long period, Logger logger) {
    this.period = period;
    this.logger = logger;
    thread = new Thread(this);
    thread.setName(threadName);
  }

  public ProgressReport(String threadName, long period) {
    this(threadName, period, LoggerFactory.getLogger(ProgressReport.class));
  }

  @Override
  public void run() {
    while (!Thread.interrupted()) {
      try {
        Thread.sleep(period);
        synchronized (ProgressReport.this) {
          logger.info(count + "/" + files + " files analyzed, current is " + currentFile.getAbsolutePath());
        }
      } catch (InterruptedException e) {
        thread.interrupt();
      }
    }
    synchronized (ProgressReport.this) {
      logger.info(files + "/" + files + " source files analyzed");
    }
  }

  public synchronized void start(int files) {
    this.files = files;
    logger.info(files + " source files to be analyzed");
    thread.start();
  }

  public synchronized void nextFile(File currentFile) {
    count++;
    this.currentFile = currentFile;
  }

  public synchronized void stop() {
    thread.interrupt();
  }

}
