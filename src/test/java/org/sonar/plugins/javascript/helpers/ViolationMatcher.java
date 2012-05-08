/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

package org.sonar.plugins.javascript.helpers;

import org.hamcrest.BaseMatcher;
import org.hamcrest.Description;
import org.sonar.api.rules.Violation;

public class ViolationMatcher extends BaseMatcher<Violation> {

  private String ruleKey;
  private Integer line;

  public ViolationMatcher(String ruleKey, Integer line) {
    this.ruleKey = ruleKey;
    this.line = line;
  }

  public boolean matches(Object o) {
    Violation v = (Violation) o;
    return ruleKey.equals(v.getRule().getKey()) && line.equals(v.getLineId());
  }

  public void describeTo(Description description) {
  }
}