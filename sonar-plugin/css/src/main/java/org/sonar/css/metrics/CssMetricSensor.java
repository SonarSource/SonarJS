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
package org.sonar.css.metrics;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.api.SonarProduct;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.css.CssLanguage;

public class CssMetricSensor implements Sensor {

  private static final Logger LOG = Loggers.get(CssMetricSensor.class);

  private final SonarRuntime sonarRuntime;
  private final FileLinesContextFactory fileLinesContextFactory;

  public CssMetricSensor(
    SonarRuntime sonarRuntime,
    FileLinesContextFactory fileLinesContextFactory
  ) {
    this.sonarRuntime = sonarRuntime;
    this.fileLinesContextFactory = fileLinesContextFactory;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.name("CSS Metrics").onlyOnLanguage(CssLanguage.KEY);
    processesFilesIndependently(descriptor);
  }

  private void processesFilesIndependently(SensorDescriptor descriptor) {
    if (
      sonarRuntime.getProduct() == SonarProduct.SONARQUBE &&
      sonarRuntime.getApiVersion().isGreaterThanOrEqual(Version.create(9, 3))
    ) {
      descriptor.processesFilesIndependently();
    }
  }

  @Override
  public void execute(SensorContext context) {
    FileSystem fileSystem = context.fileSystem();
    Iterable<InputFile> inputFiles = fileSystem.inputFiles(
      fileSystem.predicates().hasLanguage(CssLanguage.KEY)
    );

    Tokenizer tokenizer = new Tokenizer();

    for (InputFile file : inputFiles) {
      try {
        List<CssToken> tokenList = tokenizer.tokenize(file.contents());

        saveHighlights(context, file, tokenList);
        saveLineTypes(context, file, tokenList);
      } catch (IOException e) {
        LOG.error(String.format("Failed to read file '%s'", file.toString()), e);
      }
    }
  }

  private static void saveHighlights(
    SensorContext context,
    InputFile file,
    List<CssToken> tokenList
  ) {
    NewHighlighting highlighting = context.newHighlighting().onFile(file);

    for (int i = 0; i < tokenList.size(); i++) {
      CssToken currentToken = tokenList.get(i);
      CssToken nextToken = i + 1 < tokenList.size() ? tokenList.get(i + 1) : null;

      TypeOfText highlightingType = null;
      switch (currentToken.type) {
        case COMMENT:
          highlightingType = TypeOfText.COMMENT;
          break;
        case STRING:
          highlightingType = TypeOfText.STRING;
          break;
        case NUMBER:
          highlightingType = TypeOfText.CONSTANT;
          break;
        case AT_IDENTIFIER:
          highlightingType = TypeOfText.ANNOTATION;
          break;
        case DOLLAR_IDENTIFIER:
          highlightingType = TypeOfText.KEYWORD;
          break;
        case HASH_IDENTIFIER:
          if (currentToken.text.matches("^#[0-9a-fA-F]+$")) {
            highlightingType = TypeOfText.CONSTANT;
          } else {
            highlightingType = TypeOfText.KEYWORD;
          }
          break;
        case IDENTIFIER:
          // We want to highlight the property key of a css/scss/less file and as the tokenizer is putting the ':' into another token
          // we need to look for identifier followed by a PUNCTUATOR token with text ':'.
          if (nextToken != null && ":".equals(nextToken.text)) {
            highlightingType = TypeOfText.KEYWORD_LIGHT;
          }
          break;
        default:
          highlightingType = null;
      }

      if (highlightingType != null) {
        highlighting.highlight(
          currentToken.startLine,
          currentToken.startColumn,
          currentToken.endLine,
          currentToken.endColumn,
          highlightingType
        );
      }
    }

    highlighting.save();
  }

  private void saveLineTypes(SensorContext context, InputFile file, List<CssToken> tokenList) {
    // collect line types
    Set<Integer> linesOfCode = new HashSet<>();
    Set<Integer> linesOfComment = new HashSet<>();

    for (CssToken token : tokenList) {
      for (int line = token.startLine; line <= token.endLine; line++) {
        if (token.type.equals(CssTokenType.COMMENT)) {
          linesOfComment.add(line);
        } else {
          linesOfCode.add(line);
        }
      }
    }

    context
      .<Integer>newMeasure()
      .on(file)
      .forMetric(CoreMetrics.NCLOC)
      .withValue(linesOfCode.size())
      .save();
    context
      .<Integer>newMeasure()
      .on(file)
      .forMetric(CoreMetrics.COMMENT_LINES)
      .withValue(linesOfComment.size())
      .save();

    FileLinesContext fileLinesContext = fileLinesContextFactory.createFor(file);
    linesOfCode.forEach(line -> fileLinesContext.setIntValue(CoreMetrics.NCLOC_DATA_KEY, line, 1));
    fileLinesContext.save();
  }
}
