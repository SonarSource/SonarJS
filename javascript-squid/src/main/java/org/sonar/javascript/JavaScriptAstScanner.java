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

import com.google.common.base.Charsets;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.impl.Parser;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.squidbridge.AstScanner;
import org.sonar.squidbridge.SourceCodeBuilderCallback;
import org.sonar.squidbridge.SourceCodeBuilderVisitor;
import org.sonar.squidbridge.SquidAstVisitor;
import org.sonar.squidbridge.SquidAstVisitorContextImpl;
import org.sonar.squidbridge.api.SourceCode;
import org.sonar.squidbridge.api.SourceClass;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.api.SourceFunction;
import org.sonar.squidbridge.api.SourceProject;
import org.sonar.squidbridge.indexer.QueryByType;
import org.sonar.squidbridge.metrics.CommentsVisitor;
import org.sonar.squidbridge.metrics.CounterVisitor;
import org.sonar.squidbridge.metrics.LinesOfCodeVisitor;
import org.sonar.squidbridge.metrics.LinesVisitor;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.javascript.parser.EcmaScriptParser;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.io.File;
import java.util.Collection;

public final class JavaScriptAstScanner {

  private static final GrammarRuleKey[] FUNCTION_NODES = {
      EcmaScriptGrammar.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION,
      EcmaScriptGrammar.METHOD,
      EcmaScriptGrammar.GENERATOR_METHOD,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      EcmaScriptGrammar.GENERATOR_DECLARATION};

  private JavaScriptAstScanner() {
  }

  /**
   * Helper method for testing checks without having to deploy them on a Sonar instance.
   */
  public static SourceFile scanSingleFile(File file, SquidAstVisitor<LexerlessGrammar>... visitors) {
    if (!file.isFile()) {
      throw new IllegalArgumentException("File '" + file + "' not found.");
    }
    AstScanner<LexerlessGrammar> scanner = create(new EcmaScriptConfiguration(Charsets.UTF_8), visitors);
    scanner.scanFile(file);
    Collection<SourceCode> sources = scanner.getIndex().search(new QueryByType(SourceFile.class));
    if (sources.size() != 1) {
      throw new IllegalStateException("Only one SourceFile was expected whereas " + sources.size() + " has been returned.");
    }
    return (SourceFile) sources.iterator().next();
  }

  public static AstScanner<LexerlessGrammar> create(EcmaScriptConfiguration conf, SquidAstVisitor<LexerlessGrammar>... visitors) {
    final SquidAstVisitorContextImpl<LexerlessGrammar> context = new SquidAstVisitorContextImpl<LexerlessGrammar>(new SourceProject("JavaScript Project"));
    final Parser<LexerlessGrammar> parser = EcmaScriptParser.create(conf);

    AstScanner.Builder<LexerlessGrammar> builder = new ProgressAstScanner.Builder(context).setBaseParser(parser);

    /* Metrics */
    builder.withMetrics(EcmaScriptMetric.values());

    /* Comments */
    builder.setCommentAnalyser(new EcmaScriptCommentAnalyser());

    /* Files */
    builder.setFilesMetric(EcmaScriptMetric.FILES);

    /* Classes */
    builder.withSquidAstVisitor(new SourceCodeBuilderVisitor<LexerlessGrammar>(new SourceCodeBuilderCallback() {
      private int seq = 0;

      @Override
      public SourceCode createSourceCode(SourceCode parentSourceCode, AstNode astNode) {
        seq++;
        SourceClass cls = new SourceClass("class:" + seq);
        cls.setStartAtLine(astNode.getTokenLine());
        return cls;
      }
    }, EcmaScriptGrammar.CLASS_DECLARATION, EcmaScriptGrammar.CLASS_EXPRESSION));

    builder.withSquidAstVisitor(CounterVisitor.<LexerlessGrammar>builder().setMetricDef(EcmaScriptMetric.CLASSES)
      .subscribeTo(EcmaScriptGrammar.CLASS_DECLARATION, EcmaScriptGrammar.CLASS_EXPRESSION)
      .build());

    /* Functions */
    builder.withSquidAstVisitor(CounterVisitor.<LexerlessGrammar> builder()
        .setMetricDef(EcmaScriptMetric.FUNCTIONS)
        .subscribeTo(FUNCTION_NODES)
        .build());

    builder.withSquidAstVisitor(new SourceCodeBuilderVisitor<LexerlessGrammar>(new SourceCodeBuilderCallback() {
      public SourceCode createSourceCode(SourceCode parentSourceCode, AstNode astNode) {
        AstNode identifier = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER, EcmaScriptGrammar.PROPERTY_NAME, Kind.IDENTIFIER);
        final String functionName = identifier == null ? "anonymous" : identifier.getTokenValue();
        final String fileKey = parentSourceCode.isType(SourceFile.class) ? parentSourceCode.getKey() : parentSourceCode.getParent(SourceFile.class).getKey();
        SourceFunction function = new SourceFunction(fileKey + ":" + functionName + ":" + astNode.getToken().getLine() + ":" + astNode.getToken().getColumn());
        function.setStartAtLine(astNode.getTokenLine());
        return function;
      }
    }, FUNCTION_NODES));

    /* Metrics */
    builder.withSquidAstVisitor(new LinesVisitor<LexerlessGrammar>(EcmaScriptMetric.LINES));
    builder.withSquidAstVisitor(new LinesOfCodeVisitor<LexerlessGrammar>(EcmaScriptMetric.LINES_OF_CODE));
    builder.withSquidAstVisitor(CommentsVisitor.<LexerlessGrammar> builder().withCommentMetric(EcmaScriptMetric.COMMENT_LINES)
        .withNoSonar(true)
        .withIgnoreHeaderComment(conf.getIgnoreHeaderComments())
        .build());
    builder.withSquidAstVisitor(CounterVisitor.<LexerlessGrammar> builder()
        .setMetricDef(EcmaScriptMetric.STATEMENTS)
        .subscribeTo(
            Kind.VARIABLE_STATEMENT,
            Kind.EMPTY_STATEMENT,
            Kind.EXPRESSION_STATEMENT,
            Kind.IF_STATEMENT,
            Kind.DO_WHILE_STATEMENT,
            Kind.WHILE_STATEMENT,
            Kind.FOR_IN_STATEMENT,
            Kind.FOR_OF_STATEMENT,
            Kind.FOR_STATEMENT,
            Kind.CONTINUE_STATEMENT,
            Kind.BREAK_STATEMENT,
            Kind.RETURN_STATEMENT,
            Kind.WITH_STATEMENT,
            Kind.SWITCH_STATEMENT,
            Kind.THROW_STATEMENT,
            Kind.TRY_STATEMENT,
            Kind.DEBUGGER_STATEMENT)
        .build());

    builder.withSquidAstVisitor(CounterVisitor.<LexerlessGrammar>builder()
      .setMetricDef(EcmaScriptMetric.ACCESSORS)
      .subscribeTo(
        EcmaScriptGrammar.GETTER_METHOD,
        EcmaScriptGrammar.SETTER_METHOD)
      .build());

    builder.withSquidAstVisitor(new ComplexityVisitor());

    for (SquidAstVisitor<LexerlessGrammar> visitor : visitors) {
      if (visitor instanceof CharsetAwareVisitor) {
        ((CharsetAwareVisitor) visitor).setCharset(conf.getCharset());
      }
      builder.withSquidAstVisitor(visitor);
    }

    return builder.build();
  }

}
