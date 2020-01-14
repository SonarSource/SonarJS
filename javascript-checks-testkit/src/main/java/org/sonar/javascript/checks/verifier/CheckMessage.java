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
package org.sonar.javascript.checks.verifier;

import java.text.MessageFormat;
import java.util.Arrays;

/**
 * This class was copy&pasted from sslr-squid-bridge to avoid dependency on it
 */
public class CheckMessage {

  private Integer line;
  private Double cost;
  private final Object check;
  private final String defaultMessage;
  private final Object[] messageArguments;
  private Boolean bypassExclusion;

  public CheckMessage(Object check, String message, Object... messageArguments) {
    this.check = check;
    this.defaultMessage = message;
    this.messageArguments = messageArguments;
  }


  public void setLine(int line) {
    this.line = line;
  }


  public Integer getLine() {
    return line;
  }

  public void setCost(double cost) {
    this.cost = cost;
  }

  public Double getCost() {
    return cost;
  }

  public void setBypassExclusion(boolean bypassExclusion) {
    this.bypassExclusion = bypassExclusion;
  }

  public boolean isBypassExclusion() {
    return bypassExclusion != null && bypassExclusion;
  }


  public Object getCheck() {
    return check;
  }

  public String getDefaultMessage() {
    return defaultMessage;
  }

  public Object[] getMessageArguments() {
    return messageArguments;
  }


  public String getText() {
    return formatDefaultMessage();
  }

  @Override
  public String toString() {
    return "CheckMessage{" +
      "line=" + line +
      ", cost=" + cost +
      ", check=" + check +
      ", defaultMessage='" + defaultMessage + '\'' +
      ", messageArguments=" + Arrays.toString(messageArguments) +
      ", bypassExclusion=" + bypassExclusion +
      '}';
  }

  public String formatDefaultMessage() {
    if (messageArguments.length == 0) {
      return defaultMessage;
    } else {
      return MessageFormat.format(defaultMessage, messageArguments);
    }
  }

}
