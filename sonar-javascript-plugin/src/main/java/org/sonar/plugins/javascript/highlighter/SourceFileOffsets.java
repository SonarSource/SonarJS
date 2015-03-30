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
package org.sonar.plugins.javascript.highlighter;

import com.google.common.collect.Lists;
import com.google.common.io.Files;
import com.sonar.sslr.api.Token;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.List;

public class SourceFileOffsets {
  private final int length;
  private final List<Integer> lineStartOffsets = Lists.newArrayList();

  public SourceFileOffsets(String content) {
    this.length = content.length();
    initOffsets(content);
  }

  public SourceFileOffsets(File file, Charset charset) {
    this(fileContent(file, charset));
  }

  private static String fileContent(File file, Charset charset) {
    String fileContent;
    try {
      fileContent = Files.toString(file, charset);
    } catch (IOException e) {
      throw new IllegalStateException("Could not read " + file, e);
    }
    return fileContent;
  }

  private void initOffsets(String toParse) {
    lineStartOffsets.add(0);
    int i = 0;
    while (i < length) {
      if (toParse.charAt(i) == '\n' || toParse.charAt(i) == '\r') {
        int nextLineStartOffset = i + 1;
        if (i < (length - 1) && toParse.charAt(i) == '\r' && toParse.charAt(i + 1) == '\n') {
          nextLineStartOffset = i + 2;
          i++;
        }
        lineStartOffsets.add(nextLineStartOffset);
      }
      i++;
    }
  }

  public int startOffset(Token token) {
    int lineStartOffset = lineStartOffsets.get(token.getLine() - 1);
    int column = token.getColumn();
    return lineStartOffset + column;
  }

  public int endOffset(Token token) {
    return startOffset(token) + token.getValue().length();
  }
}
