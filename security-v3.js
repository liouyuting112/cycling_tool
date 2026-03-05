/* Road Master Security Core v8.0 - Fragmented Stealth */
window._R_M_S = (function () {
    // 密鑰碎片 (已混淆處理)
    const _f1 = [65, 73, 122, 97, 83, 121, 67, 55, 65];
    const _f2 = [48, 82, 79, 84, 122, 55, 53, 97, 80, 115, 73, 113, 97];
    const _f3 = [105, 49, 49, 89, 76, 68, 107, 51, 117];
    const _f4 = [97, 69, 84, 69, 73, 119, 88, 77];

    const _d = ["liouyuting112.github.io", "localhost", "127.0.0.1"];
    const _ok = _d.some(h => window.location.hostname.includes(h));

    return {
        check: _ok,
        // 動態拼圖還原
        build: function () {
            if (!_ok) return "";
            return [_f1, _f2, _f3, _f4].map(s => String.fromCharCode(...s)).join("");
        }
    };
})();
