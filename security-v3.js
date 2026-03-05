(function (global) {
    "use strict";
    // XOR Encrypted Data - Military Grade Obfuscation
    var _0x4f2a = [19, 121, 27, 5, 30, 77, 48, 60, 69, 75, 42, 82, 27, 13, 23, 1, 27, 73, 46, 118, 74, 127, 66, 122, 6, 115, 3, 47, 46, 1, 30, 83, 2, 40, 5, 7, 123, 68, 43];
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
        var allowed = ["liouyuting112.github.io", "localhost", "127.0.0.1"];
        if (window.location.protocol === "file:") return false;
        return allowed.some(d => h === d || h.endsWith('.' + d));
    }

    // 封裝成全域安全對象
    global._SECURITY_CORE = {
        isAuthorized: _verify(),
        getKey: function () {
            if (!_verify()) return null;
            return _decrypt();
        }
    };
})(window);
