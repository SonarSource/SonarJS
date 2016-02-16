/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import com.google.common.base.Charsets;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Ordering;
import com.google.common.primitives.Ints;
import com.sonar.sslr.api.typed.ActionParser;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.utils.SourceBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;

import static org.fest.assertions.Assertions.assertThat;

public class ControlFlowGraphTest {

  private static final int END = -1;

  private static final Ordering<ControlFlowBlock> BLOCK_ORDERING = Ordering.from(new BlockTokenIndexComparator());

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

  @Test
  public void no_block() throws Exception {
    ControlFlowGraph g = build("", 0);
    assertThat(g.start()).isEqualTo(g.end());
  }

  @Test
  public void single_basic_block() throws Exception {
    ControlFlowGraph g = build("foo();", 1);
    assertThat(g.start()).isEqualTo(g.blocks().iterator().next());
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
    ControlFlowBlock block = g.blocks().iterator().next();
    assertThat(block.elements()).hasSize(3);
    assertThat(block.elements().get(0).is(Kind.CALL_EXPRESSION)).isTrue();
  }

  @Test
  public void if_then() throws Exception {
    ControlFlowGraph g = build("if (a) { foo(); }", 2);
    assertBlock(g, 0).hasSuccessors(1, END);
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
  public void while_loop() throws Exception {
    ControlFlowGraph g = build("while (a) { f1(); }", 2);
    assertBlock(g, 0).hasSuccessors(1, END);
    assertBlock(g, 1).hasSuccessors(0);
  }

  @Test
  public void do_while_loop() throws Exception {
    ControlFlowGraph g = build("f1(); do { f2(); } while(a); f3();", 4);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2);
    assertBlock(g, 2).hasSuccessors(1, 3);
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
    thrown.expect(IllegalStateException.class);
    thrown.expectMessage("label xxx");
    build("outer: while (b0) { inner: while (b1) { b2(); continue xxx; } b3(); }", 0);
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
  public void break_with_invalid_label() throws Exception {
    thrown.expect(IllegalStateException.class);
    thrown.expectMessage("label xxx");
    build("outer: while (b0) { inner: while (b1) { b2(); break xxx; } b3(); }", 0);
  }

  @Test
  public void for_loop() throws Exception {
    ControlFlowGraph g = build("for(i=0; i<10; i++) { f1(); } ", 4);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(3, END);
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
    ControlFlowGraph g = build("for(var i in obj) { f2(); } ", 3, 1);
    assertBlock(g, 0).hasSuccessors(2, END);
    assertBlock(g, 1).hasSuccessors(0);
    assertBlock(g, 2).hasSuccessors(0);

    g = build("f1(); for(var i in obj) { f2(); } ", 3);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2, END);
    assertBlock(g, 2).hasSuccessors(1);
  }

  @Test
  public void continue_in_for_in() throws Exception {
    ControlFlowGraph g = build("for(var b0 in b1) { if (b2) { b3(); continue; } b4(); } ", 5, 1);
    assertBlock(g, 0).hasSuccessors(2, END);
    assertBlock(g, 1).hasSuccessors(0);
    assertBlock(g, 2).hasSuccessors(3, 4);
    assertBlock(g, 3).hasSuccessors(0);
    assertBlock(g, 4).hasSuccessors(0);
  }

  @Test
  public void for_of() throws Exception {
    ControlFlowGraph g = build("for(let b0 of b1) { b2(); } ", 3, 1);
    assertBlock(g, 0).hasSuccessors(2, END);
    assertBlock(g, 1).hasSuccessors(0);
    assertBlock(g, 2).hasSuccessors(0);
  }

  @Test
  public void try_catch() throws Exception {
    ControlFlowGraph g = build("try { b0(); } catch(e) { foo(); } ", 3);
    assertBlock(g, 0).hasSuccessors(1).hasElements("b0()");
    assertBlock(g, 1).hasSuccessors(2, END).hasElements("e");
    assertBlock(g, 2).hasSuccessors(END).hasElements("foo()");
  }

  @Test
  public void try_finally() throws Exception {
    ControlFlowGraph g = build("try { b0(); } finally { bar(); } ", 2);
    assertBlock(g, 0).hasSuccessors(1).hasElements("b0()");
    assertBlock(g, 1).hasSuccessors(END).hasElements("bar()");
  }

  @Test
  public void throw_without_try() throws Exception {
    ControlFlowGraph g = build("if (b0) { throw b1; } b2(); ", 3);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(END);
  }

  @Test
  public void throw_in_try() throws Exception {
    ControlFlowGraph g = build("try { if (b0) { throw b1; } b2(); } catch(b3) { b4(); } ", 5);
    assertBlock(g, 0).hasSuccessors(1, 2);
    assertBlock(g, 1).hasSuccessors(3);
    assertBlock(g, 2).hasSuccessors(3);
    assertBlock(g, 3).hasSuccessors(4, END);
    assertBlock(g, 4).hasSuccessors(END);
  }

  @Test
  public void throw_in_catch() throws Exception {
    ControlFlowGraph g = build("try { b0(); } catch(b1) { if (b2) { throw b3; } b4(); } finally { b5()}", 6);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2, 5);
    assertBlock(g, 2).hasSuccessors(3, 4);
    assertBlock(g, 3).hasSuccessors(5);
    assertBlock(g, 4).hasSuccessors(5);
    assertBlock(g, 5).hasSuccessors(END);
  }

  @Test
  public void return_in_catch() throws Exception {
    ControlFlowGraph g = build("try { b0(); } catch(b1) { return b2; } finally { b3()}", 4);
    assertBlock(g, 0).hasSuccessors(1);
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(END);
    assertBlock(g, 3).hasSuccessors(END);
  }

  @Test
  public void empty_switch() throws Exception {
    ControlFlowGraph g = build("switch(b0) {}", 1);
    assertBlock(g, 0).hasSuccessors(END).hasElements("b0");
  }

  @Test
  public void switch_with_no_break() throws Exception {
    ControlFlowGraph g = build("b0(); switch(b0b) { case b0c: b1(); case b2: b3(); default: b4(); }", 5);
    assertBlock(g, 0).hasSuccessors(1, 2).hasElements("b0()", "b0b", "b0c");
    assertBlock(g, 1).hasSuccessors(2).hasElements("b1()");
    assertBlock(g, 2).hasSuccessors(3, 4).hasElements("b2");
    assertBlock(g, 3).hasSuccessors(4).hasElements("b3()");
    assertBlock(g, 4).hasSuccessors(END).hasElements("b4()");
  }

  @Test
  public void switch_with_break() throws Exception {
    ControlFlowGraph g = build("b0(); switch(b0b) { case b0c: b1(); break; case b2: b3(); default: b4(); }", 5);
    assertBlock(g, 0).hasSuccessors(1, 2).hasElements("b0()", "b0b", "b0c");
    assertBlock(g, 1).hasSuccessors(END).hasElements("b1()", "break;");
    assertBlock(g, 2).hasSuccessors(3, 4).hasElements("b2");
    assertBlock(g, 3).hasSuccessors(4).hasElements("b3()");
    assertBlock(g, 4).hasSuccessors(END).hasElements("b4()");
  }

  @Test
  public void switch_with_adjacent_cases() throws Exception {
    ControlFlowGraph g = build("b0(); switch(b0b) { case b0c: b1(); case b2: case b3: b4(); }", 5);
    assertBlock(g, 0).hasSuccessors(1, 2).hasElements("b0()", "b0b", "b0c");
    assertBlock(g, 1).hasSuccessors(2).hasElements("b1()");
    assertBlock(g, 2).hasSuccessors(3, 4).hasElements("b2");
    assertBlock(g, 3).hasSuccessors(4, END).hasElements("b3");
    assertBlock(g, 4).hasSuccessors(END).hasElements("b4()");
  }

  @Test
  public void continue_in_switch_in_loop() throws Exception {
    ControlFlowGraph g = build("while(b0) { switch (b1) { case b1b: b2(); continue; } b3(); } ", 4);
    assertBlock(g, 0).hasSuccessors(1, END).hasElements("b0");
    assertBlock(g, 1).hasSuccessors(2, 3);
    assertBlock(g, 2).hasSuccessors(0);
    assertBlock(g, 3).hasSuccessors(0);
  }

  @Test
  public void with() throws Exception {
    ControlFlowGraph g = build("with(b0) { x(); y(); }", 1);
    assertBlock(g, 0).hasSuccessors(END).hasElements("b0", "x()", "y()");
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
  public void unreachable_blocks() throws Exception {
    ControlFlowGraph g = build("if (b0) { b1(); return; b2(); } b3(); ", 4);
    assertBlock(g, 0).hasSuccessors(1, 3);
    assertBlock(g, 1).hasSuccessors(END);
    assertBlock(g, 2).hasSuccessors(3).hasElements("b2()").hasDisconnectingJumps("return");
    assertBlock(g, 3).hasSuccessors(END);
    ControlFlowBlock block2 = new TestedCfg(g).block(2);
    assertThat(g.unreachableBlocks()).containsOnly(block2);
  }

  @Test
  public void multiple_disconnecting_jumps() throws Exception {
    // ControlFlowGraph g = build("return b0; do {} while(b1)", 2);
    // assertThat(g.unreachableBlocks()).containsOnly(new TestedCfg(g).block(1));
    ControlFlowGraph g = build("if (b0) { throw b1; } else if(b2) { return; } else { return; } b5();", 6);
    assertThat(g.unreachableBlocks()).containsOnly(new TestedCfg(g).block(5));
    assertBlock(g, 5).hasElements("b5()").hasDisconnectingJumps("throw", "return", "return");
  }

  @Test
  public void function_cfg() throws Exception {
    String sourceCode = "function f() { foo(); }";
    ScriptTree tree = (ScriptTree) parser.parse(sourceCode);
    FunctionTree functionTree = (FunctionDeclarationTree) tree.items().items().get(0);
    ControlFlowGraph cfg = ControlFlowGraph.build((BlockTree) functionTree.body());
    assertThat(cfg.blocks()).hasSize(1);
    assertBlock(cfg, 0).hasElements("foo()");
  }

  @Test
  public void invalid_empty_block() throws Exception {
    EndBlock end = new EndBlock();
    MutableBlock block = new SimpleBlock(end);
    thrown.expect(IllegalArgumentException.class);
    thrown.expectMessage("Cannot build block");
    new ControlFlowGraph(ImmutableSet.of(block), block, end);
  }

  private ControlFlowGraph build(String sourceCode, int expectedNumberOfBlocks) {
    return build(sourceCode, expectedNumberOfBlocks, 0);
  }

  private ControlFlowGraph build(String sourceCode, int expectedNumberOfBlocks, int expectedStartIndex) {
    Tree tree = parser.parse(sourceCode);
    ControlFlowGraph cfg = ControlFlowGraph.build((ScriptTree) tree);
    assertThat(cfg.blocks()).hasSize(expectedNumberOfBlocks);
    assertThat(cfg.end().successors()).isEmpty();
    if (!cfg.blocks().isEmpty()) {
      assertThat(sortBlocks(cfg.blocks()).get(expectedStartIndex)).as("Start block").isEqualTo(cfg.start());
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

    public BlockAssert hasSuccessors(int... expectedSuccessorIndexes) {
      Set<String> actual = new TreeSet<>();
      for (ControlFlowNode successor : testedCfg.block(blockIndex).successors()) {
        actual.add(successor == cfg.end() ? "END" : Integer.toString(testedCfg.blocks.indexOf(successor)));
      }

      Set<String> expected = new TreeSet<>();
      for (int expectedSuccessorIndex : expectedSuccessorIndexes) {
        expected.add(expectedSuccessorIndex == END ? "END" : Integer.toString(expectedSuccessorIndex));
      }

      assertThat(actual).as("Successors of block " + blockIndex).isEqualTo(expected);

      return this;
    }

    public BlockAssert hasElements(String... treeSources) {
      List<String> actual = new ArrayList<>();
      for (Tree tree : testedCfg.block(blockIndex).elements()) {
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

    private final List<ControlFlowBlock> blocks;

    public TestedCfg(ControlFlowGraph cfg) {
      this.blocks = sortBlocks(cfg.blocks());
    }

    public ControlFlowBlock block(int index) {
      return blocks.get(index);
    }

  }

  private static List<ControlFlowBlock> sortBlocks(Iterable<ControlFlowBlock> blocks) {
    return BLOCK_ORDERING.sortedCopy(blocks);
  }

  private static class BlockTokenIndexComparator implements Comparator<ControlFlowBlock> {

    @Override
    public int compare(ControlFlowBlock b1, ControlFlowBlock b2) {

      return Ints.compare(tokenIndex(b1), tokenIndex(b2));
    }

    private static int tokenIndex(ControlFlowBlock block) {
      Preconditions.checkArgument(!block.elements().isEmpty(), "Cannot sort empty block");
      JavaScriptTree tree = (JavaScriptTree) block.elements().get(0);
      InternalSyntaxToken token = (InternalSyntaxToken) tree.getFirstToken();
      return token.startIndex();
    }

  }


}
