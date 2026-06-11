"use strict";
function testFetch() {
    let args = arguments;
    args[0] = "MUTATED";
    console.log("Passed arguments[0]:", arguments[0]);
    function inner(url) {
        console.log("Inner url:", url);
    }
    inner.apply(this, args);
}

testFetch("ORIGINAL");
