// รายการลิงก์/คำที่เป็น blacklist
const BLACKLIST_PATTERNS = [
    /bit\.ly/i,
    /tinyurl\.com/i,
    /discord\.gift/i,
    /free\s*nitro/i,
    /steam\s*community.*login/i,
    /click\s*here\s*to\s*claim/i,
    /verify\s*your\s*account/i,
];

/**
 * ตรวจสอบเนื้อหาว่ามีสิ่งต้องสงสัยหรือไม่
 * @param {string} text - ข้อความที่ต้องการตรวจสอบ
 * @returns {{ blocked: boolean, reason: string }}
 */
function checkScam(text) {
    if (!text) return { blocked: false, reason: '' };

    for (const pattern of BLACKLIST_PATTERNS) {
        if (pattern.test(text)) {
            return {
                blocked: true,
                reason: `พบลิงก์หรือข้อความต้องสงสัย (${pattern.source})`,
            };
        }
    }

    return { blocked: false, reason: '' };
}

module.exports = { checkScam };
