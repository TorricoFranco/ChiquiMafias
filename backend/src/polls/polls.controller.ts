// polls/polls.controller.ts
import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { PollsService } from './polls.service'
import { CreatePollDto } from './dto/create-poll.dto'

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  // Crear votación (Admin)
  @Post()
  async create(@Body() createPollDto: CreatePollDto) {
    return this.pollsService.createPoll(createPollDto)
  }

  @Get()
  async findPolls() {
    return this.pollsService.getFindPolls()
  }

  @Get('active')
  async findActive() {
    return this.pollsService.getActivePolls()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pollsService.getPollWithResults(id)
  }
}
