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
package org.sonar.javascript.cfg;

import com.google.common.base.Function;
import com.google.common.base.Preconditions;
import com.google.common.base.Predicates;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Iterables;
import com.google.common.collect.Ordering;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.utils.SourceBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ControlFlowGraphTest {

  private static final int END = -1;

  private static final Ordering<CfgBlock> BLOCK_ORDERING = blockOrdering();

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser();

  @Test
  public void no_block() throws Exception {
    ControlFlowGraph g = build("", 0);
    assertThat(g.start()).isEqualTo(g.end());
  }

  @Test
  public void single_basic_block() throws Exception {
    ControlFlowGraph g = build("foo();", 1);

    assertThat(g.blocks()).containsOnly(g.start(), g.end());
    assertThat(g.start()).isNotEqualTo(g.end());
    assertThat(g.start().predecessors()).isEmpty();

    assertBlock(g, 0).hasSuccessors(END);
  }

  @Test
  public void empty_statement() throws Exception {
    build(";", 0);
  }

  @Test
  public void simple_statements() throws Exception {
    ControlFlowGraph g = build("foo(); var a; a = 2;", 1);
    assertBlock(g, 0).hasSuccessors(END);
  }

  @Test
  public void if_then() throws Exception {
    ControlFlowGraph g = build("if (a) { foo(); }", 2);
    assertBlock(g, 0).hasSuccessors(1, END).hasBranchingTree(Kind.IF_STATEMENT);
    assertBlock(g, 1).hasSuccessors(END);
  }

  @Test
  public void if_then_else() throws Exception {
    ControlFlowGraph g = build("if (a) { f1(); } else { f2(); }", 3);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(END);
  }

  @Test
  public void nested_if() throws Exception {
    ControlFlowGraph g = build("if (a) { if (b) { f1(); } f2(); } f3();", 5);
    assertBlock(g, 0).hasSuccessors(1, 4);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(3);
    assertBlock(g, 3).hasSuccessors(4);
    assertBlock(g, 4).hasSuccessors(END);
  }

  @Test
  public void return_statement() throws Exception {
    ControlFlowGraph g = build("if (a) { return; } f1();", 3);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(END);

    g = build("if (a) { f1() } else { return; } f2();", 4);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(3);
    assertBlock(g, 2).hasSuccessors(END);
    assertBlock(g, 3).hasSuccessors(END);
  }

  @Test
  public void return_statement_with_expression() throws Exception {
    assertBlock(build("return a;", 1), 0).hasElements("a", "return a;");
  }

  @Test
  public void while_loop() throws Exception {
    ControlFlowGraph g = build("b0(); while (b1()) { b2(); }", 3);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2, END).hasBranchingTree(Kind.WHILE_STATEMENT);
    assertBlock(g, 2).hasSuccessors(1);
  }

  @Test
  public void do_while_loop() throws Exception {
    ControlFlowGraph g = build("f1(); do { f2(); } while(a); f3();", 4);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2);
    assertBlock(g, 2).hasSuccessors(1, 3).hasBranchingTree(Kind.DO_WHILE_STATEMENT);
    assertBlock(g, 3).hasSuccessors(END);
  }

  @Test
  public void continue_in_while() throws Exception {
    ControlFlowGraph g = build("while (a) { if (b) { continue; } f1(); } f2();", 5);
    assertBlock(g, 0).hasSuccessors(1, 4);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(0);
    assertBlock(g, 3).hasSuccessors(0);
    assertBlock(g, 4).hasSuccessors(END);
  }

  @Test
  public void break_in_while() throws Exception {
    ControlFlowGraph g = build("while (a) { if (b) { break; } f1(); } f2();", 5);
    assertBlock(g, 0).hasSuccessors(1, 4);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(4);
    assertBlock(g, 3).hasSuccessors(0);
    assertBlock(g, 4).hasSuccessors(END);
  }

  @Test
  public void continue_in_do_while() throws Exception {
    ControlFlowGraph g = build("do { if (a) { continue; } f1(); } while(a);", 4);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(3);
    assertBlock(g, 2).hasSuccessors(3);
    assertBlock(g, 3).hasSuccessors(0, END);
  }

  @Test
  public void continue_with_label() throws Exception {
    ControlFlowGraph g = build("outer: while (b0) { inner: while (b1) { b2(); continue outer; } b3(); }", 4);
    assertBlock(g, 0).hasSuccessors(1, END);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(0);
    assertBlock(g, 3).hasSuccessors(0);
  }

  @Test
  public void continue_with_invalid_label() throws Exception {
    thrown.expect(RecognitionException.class);
    thrown.expectMessage("No 'continue' target can be found at line 1 (label 'xxx')");
    build("outer: while (b0) { inner: while (b1) { b2(); continue xxx; } b3(); }", 0);
  }

  @Test
  public void continue_outside_loop() throws Exception {
    thrown.expect(RecognitionException.class);
    thrown.expectMessage("No 'continue' target can be found at line 1");
    build("continue; while (b0) { }", 0);
  }

  @Test
  public void break_in_do_while() throws Exception {
    ControlFlowGraph g = build("do { if (a) { break; } f1(); } while(a);", 4);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(3);
    assertBlock(g, 3).hasSuccessors(0, END);
  }

  @Test
  public void break_with_label() throws Exception {
    ControlFlowGraph g = build("outer: while (b0) { inner: while (b1) { b2(); break outer; } b3(); }", 4);
    assertBlock(g, 0).hasSuccessors(1, END);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(END);
    assertBlock(g, 3).hasSuccessors(0);
  }

  @Test
  public void break_block() throws Exception {
    ControlFlowGraph g = build("outer: { if(b0) { b1(); break outer; } b2(); } b3();", 4);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(3);
    assertBlock(g, 2).hasSuccessors(3);
    assertBlock(g, 3).hasSuccessors(END);
  }

  @Test
  public void break_without_block() throws Exception {
    ControlFlowGraph g = build("myLabel: if(condition) break myLabel;", 2);
    assertBlock(g, 0).hasSuccessors(1, END);
    assertBlock(g, 1).hasSuccessors(END);
  }

  @Test
  public void break_with_invalid_label() throws Exception {
    thrown.expect(RecognitionException.class);
    thrown.expectMessage("No 'break' target can be found at line 1 (label 'xxx')");
    build("outer: while (b0) { inner: while (b1) { b2(); break xxx; } b3(); }", 0);
  }

  @Test
  public void for_loop() throws Exception {
    ControlFlowGraph g = build("for(i=0; i<10; i++) { f1(); } ", 4);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(3, END).hasBranchingTree(Kind.FOR_STATEMENT);
    assertBlock(g, 2).hasSuccessors(1);
    assertBlock(g, 3).hasSuccessors(2);
  }

  @Test
  public void for_with_no_init() throws Exception {
    ControlFlowGraph g = build("for(; b0<10; b1++) { b2(); }", 3);
    assertBlock(g, 0).hasSuccessors(2, END);
    assertBlock(g, 1).hasSuccessors(0);
    assertBlock(g, 2).hasSuccessors(1);
  }

  @Test
  public void for_with_no_update() throws Exception {
    ControlFlowGraph g = build("for(b0 = 0; b1<10; ) { b2(); }", 3);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2, END);
    assertBlock(g, 2).hasSuccessors(1);
  }

  @Test
  public void for_with_no_condition() throws Exception {
    ControlFlowGraph g = build("for(b0 = 0; ; b1()) { b2(); }", 3);
    assertBlock(g, 0).hasSuccessors(2);
    assertBlock(g, 1).hasSuccessors(2);
    assertBlock(g, 2).hasSuccessors(1);
  }

  @Test
  public void infinite_for() throws Exception {
    ControlFlowGraph g = build("b0(); for(;;) { b1(); } b2();", 3);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(1);
    assertBlock(g, 2).hasSuccessors(END);
  }

  @Test
  public void empty_infinite_for() throws Exception {
    ControlFlowGraph g = build("b0(); for(;;) { } b2();", 3);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(1).hasElements("for");
    assertBlock(g, 2).hasSuccessors(END);
  }

  @Test
  public void continue_in_for() throws Exception {
    ControlFlowGraph g = build("for(i=0; i<10; i++) { if (a) continue; f1(); } ", 6);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(3, END);
    assertBlock(g, 2).hasSuccessors(1);
    assertBlock(g, 3).hasSuccessors(4, 5);
    assertBlock(g, 4).hasSuccessors(2);
    assertBlock(g, 5).hasSuccessors(2);
  }

  @Test
  public void break_in_for() throws Exception {
    ControlFlowGraph g = build("for(i=0; i<10; i++) { if (a) break; f1(); } ", 6);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(3, END);
    assertBlock(g, 2).hasSuccessors(1);
    assertBlock(g, 3).hasSuccessors(4, 5);
    assertBlock(g, 4).hasSuccessors(END);
    assertBlock(g, 5).hasSuccessors(2);
  }

  @Test
  public void for_in() throws Exception {
    ControlFlowGraph g = build("for(var i in obj) { f2(); } ", 2);
    assertBlock(g, 0).hasSuccessors(1, END).hasBranchingTree(Kind.FOR_IN_STATEMENT);
    assertBlock(g, 1).hasSuccessors(0);

    g = build("f1(); for(var i in obj) { f2(); } ", 3);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2, END);
    assertBlock(g, 2).hasSuccessors(1);
  }

  @Test
  public void continue_in_for_in() throws Exception {
    ControlFlowGraph g = build("for(var b0 in b1) { if (b2) { b3(); continue; } b4(); } ", 4);
    assertBlock(g, 0).hasSuccessors(1, END);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(0);
    assertBlock(g, 3).hasSuccessors(0);
  }

  @Test
  public void for_of() throws Exception {
    ControlFlowGraph g = build("for(let b0 of b1) { b2(); } ", 2);
    assertBlock(g, 0).hasSuccessors(1, END).hasBranchingTree(Kind.FOR_OF_STATEMENT);
    assertBlock(g, 1).hasSuccessors(0);
  }

  @Test
  public void try_catch() throws Exception {
    ControlFlowGraph g = build("try { b1; } catch(e) { foo; } ", 4);
    assertBlock(g, 0).hasSuccessors(1, 2).hasElements("try").hasBranchingTree(Kind.TRY_STATEMENT);
    assertBlock(g, 1).hasSuccessors(2).hasElements("b1");
    assertBlock(g, 2).hasSuccessors(3, END).hasElements("e").hasBranchingTree(Kind.CATCH_BLOCK);
    assertBlock(g, 3).hasSuccessors(END).hasElements("foo");
  }

  @Test
  public void try_finally() throws Exception {
    ControlFlowGraph g = build("try { b0; } finally { bar; } ", 3);
    assertBlock(g, 0).hasSuccessors(1, 2).hasElements("try");
    assertBlock(g, 1).hasSuccessors(2).hasElements("b0");
    assertBlock(g, 2).hasSuccessors(END).hasElements("bar");
  }

  @Test
  public void throw_without_try() throws Exception {
    ControlFlowGraph g = build("if (b0) { throw b1; } b2; ", 3);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(END).hasElements("b1");
    assertBlock(g, 2).hasSuccessors(END);
  }

  @Test
  public void throw_in_try() throws Exception {
    ControlFlowGraph g = build("try { if (b1) { throw b2; } b3; } catch(b4) { b5; } ", 6);
    assertBlock(g, 0).hasSuccessors(1, 4);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(4);
    assertBlock(g, 3).hasSuccessors(4);
    assertBlock(g, 4).hasSuccessors(5, END);
    assertBlock(g, 5).hasSuccessors(END);
  }

  @Test
  public void throw_in_catch() throws Exception {
    ControlFlowGraph g = build("try { b1(); } catch(b2) { if (b3) { throw b4; } b5(); } finally { b6()}", 7);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(2);
    assertBlock(g, 2).hasSuccessors(3, 6);
    assertBlock(g, 3).hasSuccessors(4, 5);
    assertBlock(g, 4).hasSuccessors(6);
    assertBlock(g, 5).hasSuccessors(6);
    assertBlock(g, 6).hasSuccessors(END);
  }

  @Test
  public void return_in_catch() throws Exception {
    ControlFlowGraph g = build("try { b1(); } catch(b2) { return b3; } finally { b4()}", 5);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(2);
    assertBlock(g, 2).hasSuccessors(3, 4);
    assertBlock(g, 3).hasSuccessors(END);
    assertBlock(g, 4).hasSuccessors(END);
  }

  @Test
  public void empty_switch() throws Exception {
    ControlFlowGraph g = build("switch(b0) {}", 1);
    assertBlock(g, 0).hasSuccessors(END).hasElements("b0");
  }

  @Test
  public void switch_with_no_break() throws Exception {
    ControlFlowGraph g = build("b0; switch(b0b) { case b1: b2; case b3: b4; default: b5; }", 6);
    assertBlock(g, 0).hasSuccessors(1).hasElements("b0", "b0b");
    assertBlock(g, 1).hasSuccessors(2, 3).hasElements("b1").hasBranchingTree(Kind.CASE_CLAUSE);
    assertBlock(g, 2).hasSuccessors(4).hasElements("b2");
    assertBlock(g, 3).hasSuccessors(4, 5).hasElements("b3").hasBranchingTree(Kind.CASE_CLAUSE);
    assertBlock(g, 4).hasSuccessors(5).hasElements("b4");
    assertBlock(g, 5).hasSuccessors(END).hasElements("b5");
  }

  @Test
  public void switch_with_break() throws Exception {
    ControlFlowGraph g = build("b0; switch(b0b) { case b1: b2; break; case b3: b4; default: b5; }", 6);
    assertBlock(g, 0).hasSuccessors(1).hasElements("b0", "b0b");
    assertBlock(g, 1).hasSuccessors(2, 3).hasElements("b1");
    assertBlock(g, 2).hasSuccessors(END).hasElements("b2", "break;");
    assertBlock(g, 3).hasSuccessors(4, 5).hasElements("b3");
    assertBlock(g, 4).hasSuccessors(5).hasElements("b4");
    assertBlock(g, 5).hasSuccessors(END).hasElements("b5");
  }

  @Test
  public void switch_with_adjacent_cases() throws Exception {
    ControlFlowGraph g = build("switch(b0) { case b1: b2; case b3: case b4: b5; }", 6);
    assertBlock(g, 0).hasSuccessors(1).hasElements("b0");
    assertBlock(g, 1).hasSuccessors(2, 3).hasElements("b1");
    assertBlock(g, 2).hasSuccessors(5).hasElements("b2");
    assertBlock(g, 3).hasSuccessors(5, 4).hasElements("b3");
    assertBlock(g, 4).hasSuccessors(5, END).hasElements("b4");
    assertBlock(g, 5).hasSuccessors(END).hasElements("b5");
  }

  @Test
  public void switch_with_case_after_default() throws Exception {
    ControlFlowGraph g = build("switch(b0) { default: b1; break; case b2: b3; }", 4);
    assertBlock(g, 0).hasSuccessors(2);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(3, 1);
    assertBlock(g, 3).hasSuccessors(END);

    g = build("switch(b0) { default: b1; case b2: b3; }", 4);
    assertBlock(g, 0).hasSuccessors(2);
    assertBlock(g, 1).hasSuccessors(3);
    assertBlock(g, 2).hasSuccessors(3, 1);
    assertBlock(g, 3).hasSuccessors(END);
  }

  @Test
  public void switch_with_case_using_same_block_as_default() throws Exception {
    ControlFlowGraph g = build("switch(b0) { case b1: default: b2; break; case b3: b4; }", 5);
    assertBlock(g, 0).hasElements("b0").hasSuccessors(1);
    assertBlock(g, 1).hasElements("b1").hasSuccessors(2, 3);
    assertBlock(g, 2).hasElements("b2", "break;").hasSuccessors(END);
    assertBlock(g, 3).hasElements("b3").hasSuccessors(4, 2);
    assertBlock(g, 4).hasElements("b4").hasSuccessors(END);
  }

  @Test
  public void continue_in_switch_in_loop() throws Exception {
    ControlFlowGraph g = build("while(b0) { switch (b1) { case b2: b3(); continue; } b4(); } ", 5);
    assertBlock(g, 0).hasSuccessors(1, END).hasElements("b0");
    assertBlock(g, 1).hasSuccessors(2);
    assertBlock(g, 2).hasSuccessors(3, 4);
    assertBlock(g, 3).hasSuccessors(0);
    assertBlock(g, 4).hasSuccessors(0);
  }

  @Test
  public void with() throws Exception {
    ControlFlowGraph g = build("with(b0()) { x; y; }", 1);
    assertBlock(g, 0).hasSuccessors(END).hasElements("b0", "b0()", "x", "y");
  }

  @Test
  public void function_declaration() throws Exception {
    ControlFlowGraph g = build("function f() { if (a) { foo() } }", 1);
    assertBlock(g, 0).hasSuccessors(END);
  }

  @Test
  public void generator_declaration() throws Exception {
    ControlFlowGraph g = build("function* f() { if (a) { foo() } }", 1);
    assertBlock(g, 0).hasSuccessors(END);
  }

  @Test
  public void class_declaration() throws Exception {
    ControlFlowGraph g = build("class A { f() { if (a) { foo() } } }", 1);
    assertBlock(g, 0).hasSuccessors(END);
  }

  @Test
  public void debugger() throws Exception {
    ControlFlowGraph g = build("debugger;", 1);
    assertBlock(g, 0).hasSuccessors(END);
  }

  @Test
  public void import_statement() throws Exception {
    assertBlock(build("import x from 'other.js';", 1), 0).hasSuccessors(END);
    assertBlock(build("import \"other.js\" ;", 1), 0).hasSuccessors(END);
  }

  @Test
  public void export_statement() throws Exception {
    assertBlock(build("export { } ;", 1), 0).hasSuccessors(END);
    assertBlock(build("export default x;", 1), 0).hasSuccessors(END);
    assertBlock(build("export * from \"mod\";", 1), 0).hasSuccessors(END);
  }

  @Test
  public void and_condition() throws Exception {
    ControlFlowGraph g = build("if (b0 && b1) { b2; } b3;", 4);
    assertBlock(g, 0).hasElements("b0").hasSuccessors(1, 3).hasBranchingTree(Kind.CONDITIONAL_AND);
    assertBlock(g, 1).hasElements("b1").hasSuccessors(2, 3).hasBranchingTree(Kind.IF_STATEMENT);
    assertBlock(g, 2).hasElements("b2").hasSuccessors(3);
    assertBlock(g, 3).hasElements("b3").hasSuccessors(END);
  }

  @Test
  public void or_condition() throws Exception {
    ControlFlowGraph g = build("if (b0 || b1) { b2; } b3;", 4);
    assertBlock(g, 0).hasElements("b0").hasSuccessors(2, 1).hasBranchingTree(Kind.CONDITIONAL_OR);
    assertBlock(g, 1).hasElements("b1").hasSuccessors(2, 3).hasBranchingTree(Kind.IF_STATEMENT);
    assertBlock(g, 2).hasElements("b2").hasSuccessors(3);
    assertBlock(g, 3).hasElements("b3").hasSuccessors(END);
  }

  @Test
  public void assignment_with_one_and() throws Exception {
    ControlFlowGraph g = build("x = b0 && b1;", 3, 0);
    assertBlock(g, 0).hasElements("x", "b0").hasSuccessors(2, 1);
    assertBlock(g, 1).hasElements("b0 && b1", "x = b0 && b1").hasSuccessors(END);
    assertBlock(g, 2).hasElements("b1").hasSuccessors(1);
  }

  @Test
  public void assignment_with_two_ands() throws Exception {
    ControlFlowGraph g = build("x = b0 && b1 && b2;", 4, 0);
    assertBlock(g, 0).hasElements("x", "b0").hasSuccessors(2, 1);
    assertBlock(g, 1).hasElements("b0 && b1 && b2", "x = b0 && b1 && b2").hasSuccessors(END);
    assertBlock(g, 2).hasElements("b1").hasSuccessors(3, 1);
    assertBlock(g, 3).hasElements("b2").hasSuccessors(1);
  }

  @Test
  public void assignment_with_or() throws Exception {
    ControlFlowGraph g = build("x = b0 || b1 || b2;", 4, 0);
    assertBlock(g, 0).hasElements("x", "b0").hasSuccessors(1, 2);
    assertBlock(g, 1).hasElements("b0 || b1 || b2", "x = b0 || b1 || b2").hasSuccessors(END);
    assertBlock(g, 2).hasElements("b1").hasSuccessors(1, 3);
    assertBlock(g, 3).hasElements("b2").hasSuccessors(1);
  }

  @Test
  public void array_assignment_pattern_with_zero_element() throws Exception {
    ControlFlowGraph g = build("[] = b;", 1);
    assertBlock(g, 0).hasElements("[]", "b", "[] = b");
  }

  @Test
  public void array_assignment_pattern_with_two_elements() throws Exception {
    ControlFlowGraph g = build("[x, y] = b;", 1);
    assertBlock(g, 0).hasElements("[x, y]", "b", "[x, y] = b");
  }

  @Test
  public void array_assignment_pattern_with_object_property() throws Exception {
    ControlFlowGraph g = build("[x.a] = b;", 1);
    assertBlock(g, 0).hasElements("[x.a]", "b", "[x.a] = b");
  }

  @Test
  public void array_assignment_pattern_with_default_value() throws Exception {
    ControlFlowGraph g = build("[x = 10] = b;", 1);
    assertBlock(g, 0).hasElements("[x = 10]", "b", "[x = 10] = b");
  }

  @Test
  public void array_assignment_pattern_with_rest() throws Exception {
    ControlFlowGraph g = build("[x, ...rest] = b;", 1);
    assertBlock(g, 0).hasElements("[x, ...rest]", "b", "[x, ...rest] = b");
  }

  @Test
  public void array_assignment_pattern_with_nesting() throws Exception {
    ControlFlowGraph g = build("[x, [y, z]] = b;", 1);
    assertBlock(g, 0).hasElements("[x, [y, z]]", "b", "[x, [y, z]] = b");
  }

  @Test
  public void object_assignment_pattern_with_zero_element() throws Exception {
    ControlFlowGraph g = build("({} = {})", 1);
    assertBlock(g, 0).hasElements("{}", "{}", "{} = {}");
  }

  @Test
  public void object_assignment_pattern() throws Exception {
    ControlFlowGraph g = build("({prop1:x, prop2:y} = obj)", 1);
    assertBlock(g, 0).hasElements("{prop1:x, prop2:y}", "obj", "{prop1:x, prop2:y} = obj");
  }

  @Test
  public void object_assignment_pattern_with_one_element_and_default_value() throws Exception {
    ControlFlowGraph g = build("({prop1:x = 10} = obj)", 1);
    assertBlock(g, 0).hasElements("{prop1:x = 10}", "obj", "{prop1:x = 10} = obj");
  }

  @Test
  public void object_assignment_pattern_with_two_elements() throws Exception {
    ControlFlowGraph g = build("({prop1:x, prop2:y} = obj)", 1);
    assertBlock(g, 0).hasElements("{prop1:x, prop2:y}", "obj", "{prop1:x, prop2:y} = obj");
  }

  @Test
  public void object_assignment_pattern_with_one_element_and_short_notation() throws Exception {
    ControlFlowGraph g = build("({x} = obj)", 1);
    assertBlock(g, 0).hasElements("{x}", "obj", "{x} = obj");
  }

  @Test
  public void object_binding_pattern() throws Exception {
    ControlFlowGraph g = build("var {prop1=1} = obj", 1);
    assertBlock(g, 0).hasElements("obj", "1", "prop1", "prop1=1", "{prop1=1}", "{prop1=1} = obj", "var {prop1=1} = obj");

    g = build("let {prop1=1} = obj", 1);
    assertBlock(g, 0).hasElements("obj", "1", "prop1", "prop1=1", "{prop1=1}", "{prop1=1} = obj", "let {prop1=1} = obj");

    g = build("var {prop1, prop2} = obj", 1);
    assertBlock(g, 0).hasElements("obj", "prop1", "prop2", "{prop1, prop2}", "{prop1, prop2} = obj", "var {prop1, prop2} = obj");

    g = build("var {prop1, ...rest} = obj", 1);
    assertBlock(g, 0).hasElements("obj", "prop1", "rest", "...rest", "{prop1, ...rest}", "{prop1, ...rest} = obj", "var {prop1, ...rest} = obj");

    g = build("var {prop1:p} = obj", 1);
    assertBlock(g, 0).hasElements("obj", "p", "prop1:p", "{prop1:p}", "{prop1:p} = obj", "var {prop1:p} = obj");

    g = build("var {prop1:p=1} = obj", 1);
    assertBlock(g, 0).hasElements("obj", "1", "p", "p=1", "prop1:p=1", "{prop1:p=1}", "{prop1:p=1} = obj", "var {prop1:p=1} = obj");
  }

  @Test
  public void array_binding_pattern() throws Exception {
    ControlFlowGraph g = build("var [element1, element2] = arr", 1);
    assertBlock(g, 0).hasElements("arr", "element1", "element2", "[element1, element2]", "[element1, element2] = arr", "var [element1, element2] = arr");

    g = build("var [element1=1] = arr", 1);
    assertBlock(g, 0).hasElements("arr", "1", "element1", "element1=1", "[element1=1]", "[element1=1] = arr", "var [element1=1] = arr");

    g = build("var [, element2, ...rest] = arr", 1);
    assertBlock(g, 0).hasElements("arr", "element2", "rest", "...rest", "[, element2, ...rest]", "[, element2, ...rest] = arr", "var [, element2, ...rest] = arr");
  }

  @Test
  public void ternary() throws Exception {
    ControlFlowGraph g = build("var a = b ? c : d; e();", 4);
    assertBlock(g, 0).hasElements("b").hasSuccessors(2, 3);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasElements("c").hasSuccessors(1);
    assertBlock(g, 3).hasElements("d").hasSuccessors(1);
  }

  @Test
  public void parenthesized_expression() throws Exception {
    ControlFlowGraph g = build("(a)", 1);
    assertBlock(g, 0).hasElements("a");
  }

  @Test
  public void await_expression() throws Exception {
    ControlFlowGraph g = build("await a", 1);
    assertBlock(g, 0).hasElements("a", "await a");
  }

  @Test
  public void variable_declaration() throws Exception {
    assertExpressionElements("var a = 1", "1", "a", "a = 1");
    assertExpressionElements("var a: number = 1", "1", "a", "a: number", "a: number = 1");
  }

  @Test
  public void flow_syntax() throws Exception {
    assertExpressionElements("type A = B"/* just one element - itself */);
    assertExpressionElements("declare function foo(): void"/* just one element - itself */);
    assertExpressionElements("interface A {}"/* just one element - itself */);
  }

  @Test
  public void expressions() throws Exception {
    assertExpressionElements("a, b", "a", "b");
    assertExpressionElements("a = b", "a", "b");
    assertExpressionElements("a += b", "a", "b");
    assertExpressionElements("a + b", "a", "b");
    assertExpressionElements("+a", "a");
    assertExpressionElements("[a, b]", "a", "b");
    assertExpressionElements("a.b.c", "a", "a.b");
    assertExpressionElements("a[b]", "a", "b");
    assertExpressionElements("a(b, c)", "a", "b", "c");
    assertExpressionElements("[a, ...b]", "a", "b", "...b");
    assertExpressionElements("new a(b)", "a", "b");
    assertExpressionElements("new a", "a");
    assertExpressionElements("yield a", "a");
    assertExpressionElements("yield");
    assertExpressionElements("`x${a}`", "a", "${a}");
    assertExpressionElements("tag `x${a}`", "tag", "a", "${a}", "`x${a}`");
    assertExpressionElements("a = { [ 1 ] : b }", "a",  "1", "[ 1 ]", "b", "[ 1 ] : b", "{ [ 1 ] : b }");
  }

  private void assertExpressionElements(String source, String... expectedElements) {
    ControlFlowGraph cfg = build(source, 1);
    List<String> allExpectedElements = new ArrayList<>(Arrays.asList(expectedElements));
    allExpectedElements.add(source);
    assertBlock(cfg, 0).hasElements(allExpectedElements.toArray(new String[] {}));
  }

  @Test
  public void unreachable_blocks() throws Exception {
    ControlFlowGraph g = build("if (b0) { b1; return; b2; } b3; ", 4);
    assertBlock(g, 0).hasSuccessors(1, 3);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(3).hasElements("b2").hasDisconnectingJumps("return");
    assertBlock(g, 3).hasSuccessors(END);
    CfgBlock block2 = new TestedCfg(g).block(2);
    assertThat(g.unreachableBlocks()).containsOnly(block2);
  }

  @Test
  public void multiple_disconnecting_jumps() throws Exception {
    ControlFlowGraph g = build("if (b0) { throw b1; } else if(b2) { return; } else { return; } b5;", 6);
    assertThat(g.unreachableBlocks()).containsOnly(new TestedCfg(g).block(5));
    assertBlock(g, 5).hasElements("b5").hasDisconnectingJumps("throw", "return", "return");
  }

  @Test
  public void function_cfg() throws Exception {
    String sourceCode = "function f() { foo; }";
    ScriptTree tree = (ScriptTree) parser.parse(sourceCode);
    FunctionTree functionTree = (FunctionDeclarationTree) tree.items().items().get(0);
    ControlFlowGraph cfg = ControlFlowGraph.build((BlockTree) functionTree.body());
    assertThat(cfg.blocks()).hasSize(2);
    assertBlock(cfg, 0).hasElements("foo");
  }

  private ControlFlowGraph build(String sourceCode, int expectedNumberOfBlocks) {
    return build(sourceCode, expectedNumberOfBlocks, 0);
  }

  private ControlFlowGraph build(String sourceCode, int expectedNumberOfBlocks, int expectedStartIndex) {
    Tree tree = parser.parse(sourceCode);
    ControlFlowGraph cfg = ControlFlowGraph.build((ScriptTree) tree);
    assertThat(cfg.blocks()).hasSize(expectedNumberOfBlocks + 1); // +1 for end block
    assertThat(cfg.end().successors()).isEmpty();
    assertThat(cfg.end().elements()).isEmpty();
    if (cfg.blocks().size() > 1) {
      assertThat(sortBlocks(cfg).get(expectedStartIndex)).as("Start block").isEqualTo(cfg.start());
    }
    return cfg;
  }

  public static BlockAssert assertBlock(ControlFlowGraph cfg, int blockIndex) {
    return new BlockAssert(cfg, blockIndex);
  }

  public static class BlockAssert {

    private final ControlFlowGraph cfg;
    private final int blockIndex;
    private final TestedCfg testedCfg;

    public BlockAssert(ControlFlowGraph cfg, int blockIndex) {
      this.cfg = cfg;
      this.blockIndex = blockIndex;
      this.testedCfg = new TestedCfg(cfg);
    }

    public BlockAssert hasBranchingTree(Kind expectedKind) {
      CfgBlock block = testedCfg.block(blockIndex);
      assertThat(block).isInstanceOf(CfgBranchingBlock.class);
      assertThat(((CfgBranchingBlock) block).branchingTree().is(expectedKind)).isTrue();
      return this;
    }

    public BlockAssert hasSuccessors(int... expectedSuccessorIndexes) {
      Set<String> actual = new TreeSet<>();
      for (CfgBlock successor : testedCfg.block(blockIndex).successors()) {
        actual.add(actualBlockId(successor));
      }

      Set<String> expected = new TreeSet<>();
      for (int expectedSuccessorIndex : expectedSuccessorIndexes) {
        expected.add(expectedBlockId(expectedSuccessorIndex));
      }

      assertThat(actual).as("Successors of block " + blockIndex).isEqualTo(expected);

      if (expectedSuccessorIndexes.length == 2) {
        assertThat(actualBlockId(ControlFlowGraph.trueSuccessorFor(testedCfg.block(blockIndex)))).describedAs("TrueSuccessor")
          .isEqualTo(expectedBlockId(expectedSuccessorIndexes[0]));
        assertThat(actualBlockId(ControlFlowGraph.falseSuccessorFor(testedCfg.block(blockIndex)))).describedAs("FalseSuccessor")
          .isEqualTo(expectedBlockId(expectedSuccessorIndexes[1]));
      }

      return this;
    }

    private String expectedBlockId(int expectedSuccessorIndex) {
      return expectedSuccessorIndex == END ? "END" : Integer.toString(expectedSuccessorIndex);
    }

    private String actualBlockId(CfgBlock successor) {
      return successor == cfg.end() ? "END" : Integer.toString(testedCfg.blocks.indexOf(successor));
    }

    public BlockAssert hasElements(String... treeSources) {
      List<String> actual = new ArrayList<>();
      Iterable<Tree> elements = testedCfg.block(blockIndex).elements();
      elements = Iterables.filter(elements, Predicates.not(Predicates.instanceOf(ExpressionStatementTree.class)));
      for (Tree tree : elements) {
        actual.add(SourceBuilder.build(tree).trim());
      }
      assertThat(actual).isEqualTo(ImmutableList.copyOf(treeSources));

      return this;
    }

    public BlockAssert hasDisconnectingJumps(String... treeSources) {
      Set<String> actual = new HashSet<>();
      for (Tree tree : cfg.disconnectingJumps(testedCfg.block(blockIndex))) {
        actual.add(SourceBuilder.build(tree).trim());
      }
      assertThat(actual).isEqualTo(ImmutableSet.copyOf(treeSources));

      return this;
    }

  }

  public static class TestedCfg {

    private final List<CfgBlock> blocks;

    public TestedCfg(ControlFlowGraph cfg) {
      this.blocks = sortBlocks(cfg);
    }

    public CfgBlock block(int index) {
      return blocks.get(index);
    }

  }

  private static List<CfgBlock> sortBlocks(ControlFlowGraph cfg) {
    Set<CfgBlock> allBlocksExceptEnd = new HashSet<>(cfg.blocks());
    allBlocksExceptEnd.remove(cfg.end());
    return BLOCK_ORDERING.sortedCopy(allBlocksExceptEnd);
  }

  private static Ordering<CfgBlock> blockOrdering() {
    Ordering<Tree> bySourceLength = Ordering.natural().onResultOf(new TreeSourceLength());
    Ordering<Tree> byTokenIndex = Ordering.natural().onResultOf(new TreeTokenIndex());
    return byTokenIndex.compound(bySourceLength).onResultOf(new BlockFirstTree());
  }

  private static class BlockFirstTree implements Function<CfgBlock, Tree> {

    @Override
    public Tree apply(CfgBlock block) {
      Preconditions.checkArgument(!block.elements().isEmpty(), "Cannot sort empty block");
      return block.elements().iterator().next();
    }

  }

  private static class TreeTokenIndex implements Function<Tree, Integer> {

    @Override
    public Integer apply(Tree tree) {
      InternalSyntaxToken firstToken = (InternalSyntaxToken) tree.firstToken();
      return firstToken.startIndex();
    }

  }

  private static class TreeSourceLength implements Function<Tree, Integer> {

    @Override
    public Integer apply(Tree tree) {
      return SourceBuilder.build(tree).length();
    }

  }

}
