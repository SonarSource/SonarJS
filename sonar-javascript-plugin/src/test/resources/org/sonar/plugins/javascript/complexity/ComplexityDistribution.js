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

function name1() {
	var i;
	if (i === "abc") {
		alert('abc');
	} else if (i === "cde") {
		alert('cde');
	}
}

function name2() {
	var result;
	var red;
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

	function innerFunction() {
		var i;
		if (i === "abc") {
			alert('abc');
		} else if (i === "cde") {
			alert('cde');
		}
	}
}

function name3() {
	var b = true;
	(b == false) ? a = "true" : a = "false";
}

/** Example from http://pmd.sourceforge.net/rules/codesize.html * */
function name4() {
	if (a == b) {
		if (a1 == b1) {
			fiddle();
		} else if (a2 == b2) {
			fiddle();
		} else {
			fiddle();
		}
	} else if (c == d) {
		while (c == d) {
			fiddle();
		}
	} else if (e == f) {
		for (n = 0; n < h; n++) {
			fiddle();
		}
	} else {
		switch (z) {
		case 1:
			fiddle();
			break;
		case 2:
			fiddle();
			break;
		case 3:
			fiddle();
			break;
		default:
			fiddle();
			break;
		}
	}
}

function name5() {
	try {
		doSomethingWrong();
	} catch (error) {
		makeItAllGood();
	}
}

function name6() {
	if ((a === b) || (a === c) || (a === d)) {
		alert();
	}

	var e = ((a === b) && (a === c) && (a === d));
}

someMethodSimple = function() {
}

someClass.someMember1.someMember2.someMethodDeep = function() {
}