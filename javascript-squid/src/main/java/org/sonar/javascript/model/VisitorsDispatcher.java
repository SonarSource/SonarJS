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
package org.sonar.javascript.model;

import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

import javax.annotation.Nullable;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class VisitorsDispatcher {

  private final List<? extends Object> visitors;
  private final Set<Class> visitorClasses;
  private final Map<Class, Map<Class, Method>> visitMethods = Maps.newHashMap();
  private final Map<Class, Map<Class, Method>> leaveMethods = Maps.newHashMap();

  public VisitorsDispatcher(List<? extends TreeVisitor> visitors) {
    this.visitors = visitors;
    ImmutableSet.Builder<Class> visitorClassesBuilder = ImmutableSet.builder();
    for (Object visitor : visitors) {
      visitorClassesBuilder.add(visitor.getClass());
    }
    this.visitorClasses = visitorClassesBuilder.build();
  }

  public void visit(Object node, Class<?> nodeClass) {
    invoke(visitMethods, false, nodeClass, node);
  }

  public void leave(Object node, Class<?> nodeClass) {
    invoke(leaveMethods, true, nodeClass, node);
  }

  private void invoke(Map<Class, Map<Class, Method>> cache, boolean leave, Class<?> nodeClass, Object node) {
    Map<Class, Method> methods = cache.get(nodeClass);
    if (methods == null) {
      methods = lookup(leave, nodeClass);
      cache.put(nodeClass, methods);
    }
    for (Object visitor : leave ? Lists.reverse(visitors) : visitors) {
      Method method = methods.get(visitor.getClass());
      if (method != null) {
        try {
          method.invoke(visitor, node);
        } catch (IllegalAccessException e) {
          throw Throwables.propagate(e);
        } catch (InvocationTargetException e) {
          throw Throwables.propagate(e);
        }
      }
    }
  }

  private Map<Class, Method> lookup(boolean leave, Class<?> nodeClass) {
    ImmutableMap.Builder<Class, Method> methodsBuilder = ImmutableMap.builder();
    for (Class visitorClass : visitorClasses) {
      Method method = lookup(visitorClass, leave ? "leave" : "visit", nodeClass);
      if (method != null) {
        methodsBuilder.put(visitorClass, method);
      }
    }
    return methodsBuilder.build();
  }

  @Nullable
  private static Method lookup(Class<?> visitorClass, String methodName, Class<?> nodeClass) {
    try {
      return visitorClass.getMethod(methodName, nodeClass);
    } catch (NoSuchMethodException e) {
      for (Class base : nodeClass.getInterfaces()) {
        return lookup(visitorClass, methodName, base);
      }
      return null;
    }
  }

}
