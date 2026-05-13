import { StorageService } from './storage.service';

describe('StorageService (mock)', () => {
  beforeEach(() => {
    process.env.STORAGE_PROVIDER = 'mock';
  });

  it('generates a mock signed upload URL for CV', async () => {
    const svc = new StorageService();
    const result = await svc.getSignedUploadUrl({
      bucket: 'cv',
      key: 'user-1/cv.pdf',
      contentType: 'application/pdf',
      maxBytes: 5_000_000,
    });
    expect(result.uploadUrl).toContain('mock');
    expect(result.publicUrl).toContain('user-1/cv.pdf');
  });

  it('rejects unsupported content type for CV', async () => {
    const svc = new StorageService();
    await expect(
      svc.getSignedUploadUrl({
        bucket: 'cv',
        key: 'x',
        contentType: 'application/x-msdownload',
        maxBytes: 1000,
      }),
    ).rejects.toThrow();
  });

  it('rejects oversized maxBytes', async () => {
    const svc = new StorageService();
    await expect(
      svc.getSignedUploadUrl({
        bucket: 'logo',
        key: 'x',
        contentType: 'image/png',
        maxBytes: 50_000_000,
      }),
    ).rejects.toThrow();
  });
});
