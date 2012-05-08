/*
 * Sonar JavaScript Plugin
 * Extension for Sonar, open source software quality management tool.
 * Copyright (C) 2011 Eriks Nukis
 * mailto: eriks.nukis@gmail.com
 *
 * Sonar JavaScript Plugin is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * Sonar JavaScript Plugin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with Sonar JavaScript Plugin; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

function name1 (a) {}

var name2 = function(a, b) {}

someMethodSimple = function(a, b, c) {}

someClass.someMember1.someMember2.someMethodDeep = function() {}

functionCall(function(o){})

var a = {name3 : function (){}}

functionCall2(function(o){},function(a,b){})

someClass["name4"] = function() {}

someClass['name5'] = function() {}

name6[0] = function() {}

