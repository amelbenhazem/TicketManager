import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TicketsAttachmentsService } from './tickets-attachments.service';

const uploadStreamMock = jest.fn();
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: (...args: any[]) => uploadStreamMock(...args),
    },
  },
}));

describe('TicketsAttachmentsService (unit)', () => {
  let service: TicketsAttachmentsService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    uploadStreamMock.mockReset();
    config = { get: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TicketsAttachmentsService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(TicketsAttachmentsService);
  });

  it('uploadOne(): rejects when cloudinary is not configured', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'cloudinary.cloudName') return undefined;
      if (key === 'cloudinary.apiKey') return undefined;
      if (key === 'cloudinary.apiSecret') return undefined;
      return undefined;
    });
    await expect(
      service.uploadOne(Buffer.from('x'), 'image/png'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

