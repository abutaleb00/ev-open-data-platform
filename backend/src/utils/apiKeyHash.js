const crypto = require('crypto');

// API keys carry their own high entropy (random 24 bytes), so a fast deterministic
// HMAC is sufficient here - unlike user passwords, which need bcrypt's slow, salted
// hashing to resist guessing low-entropy secrets. HMAC also lets us look a key up by
// exact hash match (findUnique) instead of scanning + comparing every active key.
const getPepper = () => {
    const pepper = process.env.API_KEY_PEPPER || process.env.JWT_SECRET;
    if (!pepper) {
        throw new Error('API_KEY_PEPPER or JWT_SECRET must be set to hash/encrypt API keys.');
    }
    return pepper;
};

// Used only for the fast, indexed auth lookup in authMiddleware.verifyPartnerApiKey.
// One-way - never decryptable, so it alone can never be used to display the key again.
exports.hashApiKey = (rawKey) => {
    return crypto.createHmac('sha256', getPepper()).update(rawKey).digest('hex');
};

// Reversible storage so an authorized viewer (Super Admin, or the owning company) can
// copy the raw key again at any time, not just once at creation. This is a deliberate
// product decision, not a default recommendation: unlike the hash above, a database
// compromise on its own now lets an attacker recover every live API key, so keep
// API_KEY_PEPPER out of source control and rotate it if the database is ever exposed.
const ALGORITHM = 'aes-256-gcm';
const getEncryptionKey = () => crypto.createHash('sha256').update(getPepper()).digest();

exports.encryptApiKey = (rawKey) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(rawKey, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
};

// Returns null (rather than throwing) for keys created before encryptedKey existed,
// or if the stored value is malformed - callers should treat null as "not recoverable".
exports.decryptApiKey = (encryptedValue) => {
    if (!encryptedValue) return null;
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, dataHex] = parts;

    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (_) {
        return null;
    }
};
