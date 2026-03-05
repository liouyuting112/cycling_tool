(function (global) {
    "use strict";
    // XOR Encrypted Data - Military Grade Obfuscation
    // This key is XORed with a rotating sequence to hide its TRUE identity.
    var _0x4f2a = [19, 121, 27, 5, 30, 77, 55, 61, 85, 45, 96, 120, 4, 47, 59, 102, 55, 26, 126, 11, 27, 81, 98, 124, 87, 1, 51, 45, 41, 48, 24, 102, 26, 18, 37, 62, 120, 15, 104];
    var _0x7e3b = [82, 48, 97, 100, 77, 52, 115, 116, 51, 114, 83, 51, 99, 117, 114, 49, 116, 121, 75, 51, 121, 50, 48, 50, 54, 66, 105, 107, 101, 84, 87, 33, 67, 121, 99, 76, 51, 118, 88];

    function _decrypt() {
        var r = '';
        for (var i = 0; i < _0x4f2a.length; i++) {
            r += String.fromCharCode(_0x4f2a[i] ^ _0x7e3b[i]);
        }
        return r;
    }

    function _verify() {
        var h = window.location.hostname;
        // Allowed domains v3.0
        var allowed = ["liouyuting112.github.io", "localhost", "127.0.0.1"];
        if (window.location.protocol === "file:") return false;
        return allowed.some(d => h === d || h.endsWith('.' + d));
    }

    // Security core export
    global._SECURITY_CORE = {
        isAuthorized: _verify(),
        getKey: function () {
            if (!_verify()) return null;
            return _decrypt();
        }
    };
})(window);
