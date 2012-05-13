var a = (function () {
        'use strict';
        var a;
        return {
            get a() {
                return a;
            },

            set a(value) {
                a = value;
            }
        };
    }());