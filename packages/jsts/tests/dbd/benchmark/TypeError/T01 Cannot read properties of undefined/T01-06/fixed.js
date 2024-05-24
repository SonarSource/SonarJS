const sourceCode = {
    lines: ['1'],
    text: '',
    // text: 'a\nb' // fixed
}

checkBlankLines();

function checkBlankLines(node) {
    var lines = sourceCode.lines,
        fullLines = sourceCode.text.match(/.*(\r\n|\r|\n|\u2028|\u2029)/g) || [],
        firstNonBlankLine = -1,
        trimmedLines = [],
        linesRangeStart = [],
        blankCounter = 0,
        currentLocation,
        lastLocation,
        location,
        firstOfEndingBlankLines,
        diff,
        fix,
        rangeStart,
        rangeEnd;
    fix = function(fixer) {
        return fixer.removeRange([rangeStart, rangeEnd]);
    };
    linesRangeStart.push(0);
    lines.forEach(function(str, i) {
        var length = i < fullLines?.length ? fullLines[i].length : 0,
            trimmed = str.trim();
        if ((firstNonBlankLine === -1) && (trimmed !== "")) {
            firstNonBlankLine = i;
        }
        linesRangeStart.push(linesRangeStart[linesRangeStart.length - 1] + length);
        trimmedLines.push(trimmed);
    });

    // ...
}
