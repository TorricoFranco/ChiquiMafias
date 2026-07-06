import { Test, TestingModule } from '@nestjs/testing';
import { FixtureController } from './fixture.controller';

describe('FixtureController', () => {
  let controller: FixtureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FixtureController],
    }).compile();

    controller = module.get<FixtureController>(FixtureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
