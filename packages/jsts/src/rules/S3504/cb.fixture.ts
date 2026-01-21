// False positive scenario: TypeScript ambient declaration with 'declare var'
// 'declare var' is a compile-time type annotation that describes an existing
// external variable (like jQuery's $). It doesn't create a runtime variable
// and cannot be changed to let/const.

// Example 1: External library type declaration (e.g., jQuery)
declare var $: any;

// Example 2: Module globals from server-side rendering or global configuration
declare var initConfig: { apiUrl: string; debug: boolean };
declare var initPresets: string[];

// Example 3: Build-time injected variables (webpack/Vite)
declare var __CORE_VERSION__: string;
declare var __VERSION__: string;

// Example 4: React Refresh runtime globals
declare var $RefreshHelpers$: any;
declare var $RefreshReg$: any;
declare var $RefreshSig$: any;

// Regular var declarations should still be flagged
function bar() {
  var foo = 42; // Noncompliant [[qf1!]] {{Unexpected var, use let or const instead.}}
//^^^^^^^
// edit@qf1 {{  let foo = 42;}}

  var x, y = 1; // Noncompliant [[qf2!]] {{Unexpected var, use let or const instead.}}
//^^^^^
// edit@qf2 {{  let x, y = 1;}}
}
