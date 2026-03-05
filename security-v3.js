/* Road Master Security Core v9.0 - Mathematical Obliteration */
window._GHOST_SHIELD = (function () {
    // 這裡完全沒有字串，只有一堆無意義的數字運算
    const _m = [21, 24, 45, 16, 36, 4, 18, 5, 20, 48, 1, 19, 21, 24, 73, 4, 1, 24, 114, 21, 10, 10, 25, 4, 25, 23, 21, 12, 10, 24, 30, 27, 24, 4, 1, 114, 1, 2, 22];
    const _s = 44; // 混淆種子
    const _h = window.location.hostname;
    const _a = ["liouyuting112", "localhost"].some(d => _h.includes(d));

    return {
        isReady: _a,
        // 只有在極短暫的呼叫瞬間才進行拼圖
        unlock: function () {
            if (!_a) return "";
            return _m.map(v => String.fromCharCode(v ^ _s ^ 7)).join("");
        }
    };
})();
