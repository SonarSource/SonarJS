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
package org.sonar.javascript.se;

import com.google.common.base.Preconditions;
import com.google.common.base.Predicates;
import com.google.common.collect.HashMultimap;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableMap.Builder;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Maps;
import com.google.common.collect.SetMultimap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Set;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

/**
 * This class represents the knowledge about the variables values.
 * The same program state may be valid for several program points and at one program point there might be valid several program states (depending on execution path).
 * This class is immutable.
 */
public class ProgramState {

  private final ImmutableMap<Symbol, SymbolicValue> values;
  private final ImmutableMap<SymbolicValue, Constraint> constraints;
  private final ExpressionStack stack;
  private final ImmutableSet<Relation> relations;

  private int counter;

  private ProgramState(
    ImmutableMap<Symbol, SymbolicValue> values,
    ImmutableMap<SymbolicValue, Constraint> constraints,
    ExpressionStack stack,
    ImmutableSet<Relation> relations,
    int counter) {

    Set<SymbolicValue> allReferencedValues = new HashSet<>(values.values());
    if (!stack.isEmpty()) {
      allReferencedValues.add(stack.peek());
    }

    ImmutableMap.Builder<SymbolicValue, Constraint> constraintsBuilder = ImmutableMap.builder();
    for (Entry<SymbolicValue, Constraint> entry : constraints.entrySet()) {
      if (allReferencedValues.contains(entry.getKey())) {
        constraintsBuilder.put(entry.getKey(), entry.getValue());
      }
    }

    ImmutableSet.Builder<Relation> relationsBuilder = ImmutableSet.builder();
    for (Relation relation : relations) {
      if (allReferencedValues.containsAll(relation.operands())) {
        relationsBuilder.add(relation);
      }
    }

    this.values = values;
    this.constraints = constraintsBuilder.build();
    this.stack = stack;
    this.relations = relationsBuilder.build();
    this.counter = counter;
  }

  public ImmutableMap<Symbol, SymbolicValue> values() {
    return values;
  }

  public static ProgramState emptyState() {
    return new ProgramState(
      ImmutableMap.<Symbol, SymbolicValue>of(),
      ImmutableMap.<SymbolicValue, Constraint>of(),
      ExpressionStack.emptyStack(),
      ImmutableSet.<Relation>of(),
      0);
  }

  // returns new PS with this constraint added to PS for this value. If constraint for this value exists IllegalStateException
  private ProgramState addConstraint(SymbolicValue value, Constraint constraint) {
    if (constraints.containsKey(value)) {
      throw new IllegalStateException();
    }

    ImmutableMap.Builder<SymbolicValue, Constraint> constraintsBuilder = ImmutableMap.builder();
    constraintsBuilder.putAll(constraints);
    constraintsBuilder.put(value, constraint);

    return new ProgramState(ImmutableMap.copyOf(values), constraintsBuilder.build(), stack, relations, counter);
  }


  public ProgramState newSymbolicValue(Symbol symbol, @Nullable Constraint constraint) {
    SymbolicValue value = newSymbolicValue();

    ImmutableMap.Builder<Symbol, SymbolicValue> valuesBuilder = ImmutableMap.builder();
    for (Entry<Symbol, SymbolicValue> entry : values.entrySet()) {
      if (!entry.getKey().equals(symbol)) {
        valuesBuilder.put(entry.getKey(), entry.getValue());
      }
    }
    valuesBuilder.put(symbol, value);

    ProgramState newProgramState = new ProgramState(valuesBuilder.build(), ImmutableMap.copyOf(constraints), stack, relations, counter);
    if (constraint != null) {
      newProgramState = newProgramState.addConstraint(value, constraint);
    }

    return newProgramState;
  }

  public List<ProgramState> constrain(@Nullable SymbolicValue value, @Nullable Constraint constraint) {
    if (value == null || constraint == null || value.equals(UnknownSymbolicValue.UNKNOWN)) {
      return ImmutableList.of(this);
    }
    if (getConstraint(value).isIncompatibleWith(constraint)) {
      return ImmutableList.of();
    }
    Constraint newConstraint = getConstraint(value).and(constraint);
    ProgramState newState = new ProgramState(values, replaceConstraint(value, newConstraint), stack, relations, counter);
    return value.constrainDependencies(newState, constraint);
  }

  private ImmutableMap<SymbolicValue, Constraint> replaceConstraint(SymbolicValue value, Constraint newConstraint) {
    ImmutableMap.Builder<SymbolicValue, Constraint> constraintsBuilder = ImmutableMap.builder();
    for (Entry<SymbolicValue, Constraint> entry : constraints.entrySet()) {
      if (!entry.getKey().equals(value)) {
        constraintsBuilder.put(entry.getKey(), entry.getValue());
      }
    }

    constraintsBuilder.put(value, newConstraint);
    return constraintsBuilder.build();
  }

  private SymbolicValue newSymbolicValue() {
    SymbolicValue value = new SimpleSymbolicValue(counter);
    counter++;
    return value;
  }

  @CheckForNull
  public SymbolicValue getSymbolicValue(@Nullable Symbol symbol) {
    return values.get(symbol);
  }

  public Constraint getConstraint(@Nullable SymbolicValue value) {
    Constraint storedConstraint = constraints.get(value);
    storedConstraint = storedConstraint == null ? Constraint.ANY_VALUE : storedConstraint;

    return value == null ? storedConstraint : storedConstraint.and(value.baseConstraint(this));
  }

  public Constraint getConstraint(@Nullable Symbol symbol) {
    return getConstraint(getSymbolicValue(symbol));
  }

  public Nullability getNullability(@Nullable SymbolicValue value) {
    return getConstraint(value).nullability();
  }

  private Map<Symbol, Constraint> constraintsBySymbol() {
    ImmutableMap.Builder<Symbol, Constraint> builder = new Builder<>();
    for (Entry<Symbol, SymbolicValue> entry : values.entrySet()) {
      Constraint constraint = getConstraint(entry.getValue());
      if (constraint != null) {
        builder.put(entry.getKey(), constraint);
      }
    }

    return builder.build();
  }

  public ProgramState pushToStack(@Nullable SymbolicValue value) {
    return new ProgramState(values, constraints, stack.push(value), relations, counter);
  }

  public ProgramState removeLastValue() {
    return new ProgramState(values, constraints, stack.removeLastValue(), relations, counter);
  }

  public ProgramState clearStack(Tree element) {
    Preconditions.checkState(
      stack.size() == 1,
      "Stack should contain only one element before being cleaned at line %s: %s", line(element), stack);
    return new ProgramState(values, constraints, ExpressionStack.emptyStack(), relations, counter);
  }

  public void assertEmptyStack(Tree element) {
    Preconditions.checkState(stack.isEmpty(), "Stack should be empty at line %s: %s", line(element), stack);
  }

  private static int line(Tree element) {
    return ((JavaScriptTree) element).getLine();
  }

  public ProgramState execute(ExpressionTree expression) {
    return new ProgramState(values, constraints, stack.execute(expression), relations, counter);
  }

  public ProgramState assignment(Symbol variable) {
    SymbolicValue value = stack.peek();
    ExpressionStack newStack = stack;
    if (UnknownSymbolicValue.UNKNOWN.equals(value)) {
      value = newSymbolicValue();
      newStack = newStack.removeLastValue();
      newStack = newStack.push(value);
    }
    Map<Symbol, SymbolicValue> newValues = new HashMap<>(values);
    newValues.put(variable, value);
    return new ProgramState(ImmutableMap.copyOf(newValues), constraints, newStack, relations, counter);
  }

  public Set<Relation> relations() {
    return relations;
  }

  public ProgramState addRelation(Relation relation) {
    ImmutableSet<Relation> newRelations = ImmutableSet.<Relation>builder()
      .addAll(relations)
      .add(relation)
      .build();
    return new ProgramState(values, constraints, stack, newRelations, counter);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }

    ProgramState that = (ProgramState) o;

    return Objects.equals(constraintsBySymbol(), that.constraintsBySymbol())
      && Objects.equals(stack, that.stack)
      && Objects.equals(constraintOnPeek(), that.constraintOnPeek())
      && Objects.equals(relationsOnSymbols(), that.relationsOnSymbols());
  }

  @Override
  public int hashCode() {
    return Objects.hash(constraintsBySymbol(), stack, constraintOnPeek(), relationsOnSymbols());
  }

  private Set<RelationOnSymbols> relationsOnSymbols() {
    SetMultimap<SymbolicValue, Symbol> symbolsByValue = HashMultimap.create();
    for (Entry<Symbol, SymbolicValue> entry : values.entrySet()) {
      symbolsByValue.put(entry.getValue(), entry.getKey());
    }

    Set<RelationOnSymbols> relationsOnSymbols = new HashSet<>();
    for (Relation relation : relations) {
      for (Symbol leftOperand : symbolsByValue.get(relation.leftOperand())) {
        for (Symbol rightOperand : symbolsByValue.get(relation.rightOperand())) {
          relationsOnSymbols.add(new RelationOnSymbols(relation.operator(), leftOperand, rightOperand));
        }
      }
    }
    return relationsOnSymbols;
  }

  @CheckForNull
  private Constraint constraintOnPeek() {
    if (stack.isEmpty()) {
      return null;
    }
    return getConstraint(peekStack());
  }

  public SymbolicValue peekStack() {
    return stack.peek();
  }

  // if n == 0 returns peek
  public SymbolicValue peekStack(int n) {
    return stack.peek(n);
  }

  public ProgramState removeSymbols(Set<Symbol> symbolsToKeep) {
    Map<Symbol, SymbolicValue> newValues = Maps.filterKeys(values, Predicates.in(symbolsToKeep));
    return new ProgramState(ImmutableMap.copyOf(newValues), constraints, stack, relations, counter);
  }

  @Override
  public String toString() {
    return "[" + values + ";" + constraints + ";" + stack + ";" + relations + "]";
  }
}
