export class FileSignatureValidator {
  /**
   * Verifies if the buffer matches common safe file signatures (magic numbers).
   * Supports: PDF, JPG, PNG
   */
  static isValidSignature(buffer: Buffer, expectedType: 'application/pdf' | 'image/jpeg' | 'image/png'): boolean {
    if (!buffer || buffer.length < 4) return false;

    const hex = buffer.subarray(0, 4).toString('hex').toUpperCase();

    if (expectedType === 'application/pdf') {
      // PDF magic number: %PDF (25 50 44 46)
      return hex === '25504446';
    } 
    
    if (expectedType === 'image/jpeg') {
      // JPEG magic number: FF D8 FF
      return hex.startsWith('FFD8FF');
    }
    
    if (expectedType === 'image/png') {
      // PNG magic number: 89 50 4E 47
      return hex === '89504E47';
    }

    return false;
  }
}
