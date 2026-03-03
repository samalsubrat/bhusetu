import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16        // 128-bit IV
const AUTH_TAG_LENGTH = 16  // 128-bit auth tag

/**
 * Get the 32-byte encryption key from environment.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY
    if (!hex || hex.length !== 64) {
        throw new Error(
            "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
            "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        )
    }
    return Buffer.from(hex, "hex")
}

/**
 * Encrypt a buffer using AES-256-GCM.
 * Returns: [IV (16 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]
 */
export function encrypt(plaintext: Buffer): Buffer {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Pack: IV + AuthTag + Ciphertext
    return Buffer.concat([iv, authTag, encrypted])
}

/**
 * Decrypt a buffer that was encrypted with the encrypt() function above.
 * Expects: [IV (16 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]
 */
export function decrypt(packed: Buffer): Buffer {
    const key = getKey()
    const iv = packed.subarray(0, IV_LENGTH)
    const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
