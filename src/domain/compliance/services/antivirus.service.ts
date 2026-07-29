export interface IAntivirusScanner {
  scanBuffer(buffer: Buffer, fileName: string): Promise<boolean>;
}

export class StubAntivirusScanner implements IAntivirusScanner {
  async scanBuffer(buffer: Buffer, fileName: string): Promise<boolean> {
    console.log(`[ANTIVIRUS_STUB] Scanning file: ${fileName} (${buffer.length} bytes)`);
    // Simulate a scan delay
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`[ANTIVIRUS_STUB] Scan complete. No threats detected in ${fileName}.`);
    return true; // Pass for the stub
  }
}
