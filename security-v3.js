(function (global) {
    "use strict";
    // XOR Encrypted Data - Military Grade Obfuscation v3.6
    // This key is XORed with a rotating sequence to hide its TRUE identity.
    var _0x4f2a = [19, 121, 27, 5, 30, 77, 48, 67, 114, 66, 1, 124, 55, 15, 69, 4, 21, 41, 56, 122, 8, 83, 89, 3, 7, 27, 37, 47, 14, 103, 34, 64, 6, 45, 38, 5, 68, 46, 21];
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
        // Allowed domains: Only current GitHub profile and localhost
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
