const __sonar__ = require("__sonar__");
const sink = __sonar__.SQL_INJECTION_SINK;
const source = __sonar__.SQL_INJECTION_SOURCE;

const tainted = source();
// The following is TS code, but has no impact on the analysis.
if ("ts" as Object) {
    console.log("");
}
sink(tainted); 
