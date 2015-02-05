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
package org.sonar.plugins.javascript.unittest.surefireparser;

import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.sonar.api.utils.StaxParser;
import org.sonar.test.TestUtils;

import javax.xml.stream.XMLStreamException;
import java.io.File;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.hamcrest.core.Is.is;

public class SurefireStaxHandlerTest {

  private UnitTestIndex index;

  @Before
  public void setUp() {
    index = new UnitTestIndex();
  }

  @Test
  public void shouldLoadInnerClasses() throws XMLStreamException {
    parse("innerClasses.xml");

    UnitTestClassReport publicClass = index.get("org.apache.commons.collections.bidimap.AbstractTestBidiMap");
    assertThat(publicClass.getTests(), is(2L));

    UnitTestClassReport innerClass1 = index.get("org.apache.commons.collections.bidimap.AbstractTestBidiMap$TestBidiMapEntrySet");
    assertThat(innerClass1.getTests(), is(2L));

    UnitTestClassReport innerClass2 = index.get("org.apache.commons.collections.bidimap.AbstractTestBidiMap$TestInverseBidiMap");
    assertThat(innerClass2.getTests(), is(3L));
    assertThat(innerClass2.getDurationMilliseconds(), is(30 + 1L));
    assertThat(innerClass2.getErrors(), is(1L));
  }

  @Test
  public void shouldSuiteAsInnerClass() throws XMLStreamException {
    parse("suiteInnerClass.xml");
    assertThat(index.size(), is(0));
  }

  @Test
  public void shouldHaveSkippedTests() throws XMLStreamException {
    parse("skippedTests.xml");
    UnitTestClassReport report = index.get("org.sonar.Foo");
    assertThat(report.getTests(), is(3L));
    assertThat(report.getSkipped(), is(1L));
  }

  @Test
  public void shouldHaveZeroTests() throws XMLStreamException {
    parse("zeroTests.xml");
    assertThat(index.size(), is(0));
  }

  @Test
  public void shouldHaveTestOnRootPackage() throws XMLStreamException {
    parse("rootPackage.xml");
    assertThat(index.size(), is(1));
    UnitTestClassReport report = index.get("NoPackagesTest");
    assertThat(report.getTests(), is(2L));
  }

  @Test
  public void shouldHaveErrorsAndFailures() throws XMLStreamException {
    parse("errorsAndFailures.xml");
    UnitTestClassReport report = index.get("org.sonar.Foo");
    assertThat(report.getErrors(), is(1L));
    assertThat(report.getFailures(), is(1L));
    assertThat(report.getResults().size(), is(2));

    // failure
    UnitTestResult failure = report.getResults().get(0);
    assertThat(failure.getDurationMilliseconds(), is(5L));
    assertThat(failure.getStatus(), is(UnitTestResult.STATUS_FAILURE));
    assertThat(failure.getName(), is("testOne"));
    assertThat(failure.getMessage(), startsWith("expected"));

    // error
    UnitTestResult error = report.getResults().get(1);
    assertThat(error.getDurationMilliseconds(), is(0L));
    assertThat(error.getStatus(), is(UnitTestResult.STATUS_ERROR));
    assertThat(error.getName(), is("testTwo"));
  }

  @Test
  public void shouldSupportMultipleSuitesInSameReport() throws XMLStreamException {
    parse("multipleSuites.xml");

    assertThat(index.get("org.sonar.JavaNCSSCollectorTest").getTests(), is(11L));
    assertThat(index.get("org.sonar.SecondTest").getTests(), is(4L));
  }

  private void parse(String path) throws XMLStreamException {
    File xml = TestUtils.getResource("/org/sonar/plugins/javascript/surefireparser/" + path);
    SurefireStaxHandler staxParser = new SurefireStaxHandler(index);
    StaxParser parser = new StaxParser(staxParser, false);
    parser.parse(xml);
  }
}
