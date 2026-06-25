// No issue - URL has no version path segment
var script1 = document.createElement("script");
script1.src = "https://www.googletagmanager.com/gtag/js?id=UA-XXXXX-X";
document.head.appendChild(script1);

// No issue - only API major version (v3 has no minor component)
var script2 = document.createElement("script");
script2.src = "https://js.stripe.com/v3/stripe.js";
document.head.appendChild(script2);

// Sensitive - versioned URL (semver path), missing integrity
var script3 = document.createElement("script");
script3.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js";
script3.crossOrigin = "anonymous";
document.head.appendChild(script3);

// Sensitive - versioned URL (package@version), missing crossorigin
var script4 = document.createElement("script");
script4.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
script4.integrity = "sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut";
document.head.appendChild(script4);

// Compliant - versioned URL with both integrity and crossOrigin
var script5 = document.createElement("script");
script5.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
script5.integrity = "sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut";
script5.crossOrigin = "anonymous";
document.head.appendChild(script5);

function crossOriginUnresolved(crossOrigin){
// Compliant - versioned URL with both integrity and crossOrigin (unresolved)
var script6 = document.createElement("script");
    script6.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
    script6.integrity = "sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut";
    script6.crossOrigin = crossOrigin;
    document.head.appendChild(script6);
}

// Sensitive - versioned URL with both integrity but crossOrigin is not "anonymous";
var script7 = document.createElement("script");
script7.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
script7.integrity = "sha384-wHAiFfRlMFy6i5SRaxvfOCifBUQy1xHdJ/yoi7FRNXMRBu5WHdZYu1hA6ZOblgut";
script7.crossOrigin = "something-else";
document.head.appendChild(script7);
