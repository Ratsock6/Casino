import { Test, TestingModule } from '@nestjs/testing';
import { GameConfigService } from './game-config.service';

describe('GameConfigService', () => {
  let service: GameConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameConfigService],
    }).compile();

    service = module.get<GameConfigService>(GameConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
