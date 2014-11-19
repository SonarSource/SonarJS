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
package org.sonar.javascript.parser.sslr;

import com.google.common.base.Preconditions;

import javax.annotation.CheckForNull;
import javax.annotation.Nullable;

/**
 * Loosely modeled after {@link com.google.common.base.Optional}.
 */
public abstract class Optional<T> {

  @SuppressWarnings("unchecked")
  public static <T> Optional<T> absent() {
    return (Optional<T>) Absent.INSTANCE;
  }

  public static <T> Optional<T> of(T reference) {
    return new Present<T>(Preconditions.checkNotNull(reference));
  }

  public abstract boolean isPresent();

  public abstract T get();

  public abstract T or(T defaultValue);

  @CheckForNull
  public abstract T orNull();

  private static class Present<T> extends Optional<T> {
    private final T reference;

    public Present(T reference) {
      this.reference = reference;
    }

    @Override
    public boolean isPresent() {
      return true;
    }

    @Override
    public T get() {
      return reference;
    }

    @Override
    public T or(Object defaultValue) {
      Preconditions.checkNotNull(defaultValue, "use orNull() instead of or(null)");
      return reference;
    }

    @CheckForNull
    @Override
    public T orNull() {
      return reference;
    }

    @Override
    public boolean equals(@Nullable Object object) {
      if (object instanceof Present) {
        Present other = (Present) object;
        return reference.equals(other.reference);
      }
      return false;
    }

    @Override
    public int hashCode() {
      return 0x598df91c + reference.hashCode();
    }

    @Override
    public String toString() {
      return "Optional.of(" + reference + ")";
    }
  }

  private static class Absent extends Optional<Object> {
    private static final Absent INSTANCE = new Absent();

    @Override
    public boolean isPresent() {
      return false;
    }

    @Override
    public Object get() {
      throw new IllegalStateException("value is absent");
    }

    @Override
    public Object or(Object defaultValue) {
      return Preconditions.checkNotNull(defaultValue, "use orNull() instead of or(null)");
    }

    @CheckForNull
    @Override
    public Object orNull() {
      return null;
    }

    @Override
    public boolean equals(@Nullable Object object) {
      return object == this;
    }

    @Override
    public int hashCode() {
      return 0x598df91c;
    }

    @Override
    public String toString() {
      return "Optional.absent()";
    }
  }

}
