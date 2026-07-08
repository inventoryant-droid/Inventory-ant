import { Test, TestingModule } from '@nestjs/testing';
import { BrevoProvider } from './brevo.provider';
import { BadRequestException } from '@nestjs/common';

describe('BrevoProvider', () => {
  let provider: BrevoProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrevoProvider],
    }).compile();

    provider = module.get<BrevoProvider>(BrevoProvider);
    process.env.BREVO_API_KEY = 'test_key';
    process.env.SMTP_SENDER = 'test@sender.com';
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.SMTP_SENDER;
    jest.restoreAllMocks();
  });

  it('should call fetch to Brevo REST API on send', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ messageId: '123' }),
      } as any),
    );

    await provider.send({
      to: 'target@test.com',
      subject: 'Test Subject',
      html: '<h1>Test Content</h1>',
    });

    expect(mockFetch).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', expect.objectContaining({
      method: 'POST',
      headers: {
        'api-key': 'test_key',
        'content-type': 'application/json',
        'accept': 'application/json',
      },
    }));
  });

  it('should throw BadRequestException if API key is missing', async () => {
    delete process.env.BREVO_API_KEY;

    await expect(provider.send({
      to: 'target@test.com',
      subject: 'Subject',
      html: '<html/>',
    })).rejects.toThrow(BadRequestException);
  });
});
