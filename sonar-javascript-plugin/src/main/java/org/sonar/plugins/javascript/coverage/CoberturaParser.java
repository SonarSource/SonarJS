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

package org.sonar.plugins.javascript.coverage;

import org.apache.commons.lang.StringUtils;
import org.codehaus.staxmate.in.SMHierarchicCursor;
import org.codehaus.staxmate.in.SMInputCursor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.utils.StaxParser;

import javax.xml.stream.XMLStreamException;

import java.io.File;
import java.util.LinkedList;
import java.util.List;

public final class CoberturaParser implements CoverageParser {
  private static final Logger LOG = LoggerFactory.getLogger(CoberturaParser.class);
  
  public List<JavaScriptFileCoverage> parseFile(File file) throws XMLStreamException{	
  	LOG.info("Parsing report '{}'", file);
  	
  	final List<JavaScriptFileCoverage> coveredFiles = new LinkedList<JavaScriptFileCoverage>();
  	StaxParser parser = new StaxParser(new StaxParser.XmlStreamHandler() {
        public void stream(SMHierarchicCursor rootCursor) throws XMLStreamException {
          rootCursor.advance();
          collectPackageMeasures(rootCursor.descendantElementCursor("package"), coveredFiles);
        }
      });
      parser.parse(file);
      return coveredFiles;
  }
	
  private void collectPackageMeasures(SMInputCursor pack, List<JavaScriptFileCoverage> coverageData) throws XMLStreamException {
    while (pack.getNext() != null) {
      collectFileMeasures(pack.descendantElementCursor("class"), coverageData);
    }
  }

  private void collectFileMeasures(SMInputCursor clazz, List<JavaScriptFileCoverage> coverageData) throws XMLStreamException {
    while (clazz.getNext() != null) {
      String fileName = clazz.getAttrValue("filename");
      JavaScriptFileCoverage fileCoverage = new JavaScriptFileCoverage();
      fileCoverage.setFilePath(fileName);
      coverageData.add(fileCoverage);
      collectFileData(clazz, fileCoverage);
    }
  }

  private void collectFileData(SMInputCursor clazz, JavaScriptFileCoverage fileCoverage) throws XMLStreamException {
    SMInputCursor line = clazz.childElementCursor("lines").advance().childElementCursor("line");
    while (line.getNext() != null) {
      int lineId = Integer.parseInt(line.getAttrValue("number"));
      fileCoverage.addLine(lineId, Integer.parseInt(line.getAttrValue("hits")));

      String isBranch = line.getAttrValue("branch");
      String text = line.getAttrValue("condition-coverage");
      if (StringUtils.equals(isBranch, "true") && StringUtils.isNotBlank(text)) {
        String[] conditions = StringUtils.split(StringUtils.substringBetween(text, "(", ")"), "/");
        fileCoverage.addConditions(lineId,  Integer.parseInt(conditions[1]), Integer.parseInt(conditions[0]));
      }
    }
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
