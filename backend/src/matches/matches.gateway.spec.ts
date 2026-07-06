import { Test, TestingModule } from '@nestjs/testing';
import { MatchesGateway } from './matches.gateway';

describe('MatchesGateway', () => {
  let gateway: MatchesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchesGateway],
    }).compile();

    gateway = module.get<MatchesGateway>(MatchesGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
