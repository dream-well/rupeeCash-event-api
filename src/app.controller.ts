import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';


@Controller()
export class AppController {

  constructor(
    private readonly appService: AppService,
  ) {}

  // @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(): Promise<Array<Object>> {
    const transactions = await this.appService.getSyncTransactions();
    return transactions;
  }

  @Get('settlements')
  async getSettlements(@Query('limit') limit, @Query('offset') offset): Promise<Array<Object>> {
    const settlements = await this.appService.getEvents({$or: [{name: "Make_Settlement"}, {name: "Make_Settlement_For_Merchant"}]}, limit, offset);
    return settlements;
  }

}
