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

package org.sonar.plugins.javascript.surefire;

import org.apache.commons.lang.StringEscapeUtils;

/**
 * Represents a unit test case. Has a couple of data items like name,
 * status, time etc. associated. Reports testcase details in sonar-conform XML
 */
public class TestCase {
  private static final String STATUS_OK = "ok";
  private static final String STATUS_ERROR = "error";
  private static final String STATUS_FAILURE = "failure";
  private static final String STATUS_SKIPPED = "skipped";

  private String name;
  private String status = STATUS_OK;
  private String stackTrace;
  private String errorMessage;
  private int time = 0;

  /**
   * Constructs a testcase instance out of following parameters
   * @params name The name of this testcase
   * @params time The execution time in milliseconds
   * @params status The execution status of the testcase
   * @params stack The stack trace occurred while executing of this testcase;
   *               pass "" if the testcase passed/skipped.
   * @params msg The error message accosiated with this testcase of the execution
   *             was errouneous; pass "" if not.
   */
  public TestCase(String name, int time, String status, String stack, String msg) {
    this.name = name;
    this.time = time;
    this.stackTrace = stack;
    this.errorMessage = msg;
    this.status = status;
  }

  /**
   * Returns true if this testcase is an error, false otherwise
   */
  public boolean isError() {
    return STATUS_ERROR.equals(status);
  }

  /**
   * Returns true if this testcase is a failure, false otherwise
   */
  public boolean isFailure() {
    return STATUS_FAILURE.equals(status);
  }

  /**
   * Returns true if this testcase has been skipped, failure, false otherwise
   */
  public boolean isSkipped() {
    return STATUS_SKIPPED.equals(status);
  }

  public int getTime() {
    return time;
  }

  /**
   * Returns execution details as sonar-conform XML
   */
  public String getDetails() {
    StringBuilder details = new StringBuilder();
    details.append("<testcase status=\"")
        .append(status)
        .append("\" time=\"")
        .append(time)
        .append("\" name=\"")
        .append(name)
        .append("\"");
    if (isError() || isFailure()) {
      details.append(">")
          .append(isError() ? "<error message=\"" : "<failure message=\"")
          .append(StringEscapeUtils.escapeXml(errorMessage))
          .append("\">")
          .append("<![CDATA[")
          .append(StringEscapeUtils.escapeXml(stackTrace))
          .append("]]>")
          .append(isError() ? "</error>" : "</failure>")
          .append("</testcase>");
    } else {
      details.append("/>");
    }

    return details.toString();
  }
}