// utils/encryption.ts
export class FileEncryption {
    private static readonly ALGORITHM = 'AES-GCM';
    private static readonly KEY_LENGTH = 256;
    private static readonly NONCE_LENGTH = 12;
    private static readonly SALT_LENGTH = 16;
  
    static async encryptFile(file: File): Promise<{
      encryptedFile: Blob;
      encryption_salt: string;
      encryption_nonce: string;
    }> {
      try {
        // Generate salt and nonce
        const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const nonce = window.crypto.getRandomValues(new Uint8Array(this.NONCE_LENGTH));
  
        // Read the file
        const fileArrayBuffer = await file.arrayBuffer();
  
        // Generate key using salt
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(file.name),
          'PBKDF2',
          false,
          ['deriveKey']
        );
  
        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: this.ALGORITHM, length: this.KEY_LENGTH },
          false,
          ['encrypt']
        );
  
        // Encrypt the file
        const encryptedData = await window.crypto.subtle.encrypt(
          {
            name: this.ALGORITHM,
            iv: nonce
          },
          key,
          fileArrayBuffer
        );
  
        // Convert to base64 strings
        const saltBase64 = btoa(String.fromCharCode(...salt));
        const nonceBase64 = btoa(String.fromCharCode(...nonce));
  
        // Create encrypted file blob
        const encryptedFile = new Blob([encryptedData], { type: 'application/octet-stream' });
  
        return {
          encryptedFile,
          encryption_salt: saltBase64,
          encryption_nonce: nonceBase64
        };
      } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt file');
      }
    }
  }