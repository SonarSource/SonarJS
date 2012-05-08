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

function name2() {

// comment line
	var result;
	
	
	var red; // inline comment line
	switch (red) {
	case 1:
		result = 'one';
		break;
	case 2:
		result = 'two';
		break;
	case 3:
		result = 'three';
		break;
	default:
		result = 'unknown';
	}
/**
Multiline comment text
Second line
Third line
**/
	function innerFunction() {
		var i;
		if (i === "abc") {
			alert('abc');
		} else if (i === "cde") {
			alert('cde');
		}
	}
}