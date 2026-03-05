/*
 * Road Master Security Core v6.1
 * Triple-XOR Encrypted Key Storage
 */
const _SECURITY_CORE = (function () {
    const _a = [51, 77, 93, 98, 67, 63, 36, 0, 103, 66, 4, 74, 20, 6, 37, 20, 98, 119, 21, 81, 115, 82, 73, 56, 50, 102, 27, 20, 111, 3, 74, 123, 115, 62, 39, 21, 110, 4, 54];
    const _b = [53, 76, 104, 80, 68, 25, 52, 127, 111, 55, 26, 65, 31, 44, 64, 110, 92, 119, 52, 87, 86, 118, 99, 93, 92, 13, 103, 98, 50, 111, 105, 44, 113, 34, 45, 15, 77, 3, 40];
    const _s = "GHOST_SHIELD_PRO_PROTECT_2026_V6";
    const _d = ["liouyuting112.github.io", "localhost", "127.0.0.1"];
    const _ok = _d.some(function (h) { return window.location.hostname.indexOf(h) !== -1; });
    return {
        isAuthorized: _ok,
        getKey: function () {
            if (!_ok) return "";
            var r = "";
            for (var i = 0; i < _a.length; i++) r += String.fromCharCode(_a[i] ^ _b[i] ^ _s.charCodeAt(i % _s.length));
            return r;
        }
    };
})();
window._SECURITY_CORE = _SECURITY_CORE;
