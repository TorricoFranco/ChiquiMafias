import { Test, TestingModule } from '@nestjs/testing';
import { FixtureGateway } from './fixture.gateway';

describe('FixtureGateway', () => {
  let gateway: FixtureGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FixtureGateway],
    }).compile();

    gateway = module.get<FixtureGateway>(FixtureGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
