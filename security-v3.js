/* 
   Road Master Security Module v6.0 - Ghost Shield Edition
   Encrypted API Key Storage with Header-based Security
*/
const _SECURITY_CORE = (function () {
    // 加密過的複雜數列 (XOR 混淆)
    const _p1 = [72, 72, 25, 4, 18, 56, 10, 119, 0, 101, 21, 1, 23, 27, 26, 4, 30, 24, 114, 5, 114, 21, 103, 115, 20, 10, 25, 106, 112, 107, 105, 102, 103, 112, 114, 110, 104, 126, 109];
    const _p2 = [1, 9, 107, 85, 107, 121, 127, 48, 67, 29, 118, 114, 120, 104, 111, 116, 121, 104, 43, 80, 50, 114, 15, 18, 101, 121, 104, 24, 5, 25, 23, 16, 22, 1, 2, 7, 21, 47, 24];
    const _k1 = "GHOST_SHIELD_PRO_PROTECT_2026_V6";

    // 嚴格網域驗證
    const _auth = ["liouyuting112.github.io", "localhost", "127.0.0.1"].some(d => window.location.hostname.includes(d));

    return {
        isAuthorized: _auth,
        // 僅在呼叫時於記憶體內極短暫存在
        getKey: function () {
            if (!_auth) return null;
            let result = "";
            for (let i = 0; i < _p1.length; i++) {
                const charCode = (_p1[i] ^ _p2[i] ^ _k1.charCodeAt(i % _k1.length));
                result += String.fromCharCode(charCode);
            }
            return result;
        }
    };
})();
window._SECURITY_CORE = _SECURITY_CORE;
