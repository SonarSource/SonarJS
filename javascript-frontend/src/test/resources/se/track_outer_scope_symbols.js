var globalVar = 42;
var globalDead = 42;
var globalFunc = function () {}

function outer(p) {

  var outerVar=unknown();
  p = 42;

  function main(par) {

    if (outerVar) {

      foo(); // PS globalVar=TRUTHY_NUMBER & outerVar=TRUTHY & outer=FUNCTION & main=FUNCTION & globalFunc=FUNCTION & !p & !globalDead

      makeLive(globalVar, outerVar, outer, main, p, par, globalFunc);
    }
  }

}
