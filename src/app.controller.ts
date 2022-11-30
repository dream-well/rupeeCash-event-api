import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';


@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private authService: AuthService  
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(@Query() query): Promise<Object> {
    const [deposits, cashouts, info] = await Promise.all([
      this.appService.getDepositAmount(query.from, query.to),
      this.appService.getCashoutAmount(query.from, query.to),
      this.appService.getPayinInfo(query.from, query.to)
    ])
    const pending = 0;
    return {
      deposits, cashouts,
      rollingReserve: { total: info['total'], released: info['released'] },
      totalChargeback: info['totalChargeback'],
      totalChargebackPaid: info['totalChargebackPaid'],
      settlements: { pending: 0, settled: info['settled'] - pending }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('deposits')
  async getDeposits(): Promise<Array<Object>> {
    const deposits = await this.appService.getDeposits();
    return deposits;
  }

  @UseGuards(JwtAuthGuard)
  @Get('payouts')
  async getPayouts(): Promise<Array<Object>> {
    const payouts = await this.appService.getPayouts();
    return payouts;
  }

  @UseGuards(JwtAuthGuard)
  @Get('settlements')
  async getSettlements(): Promise<Array<Object>> {
    const settlements = await this.appService.getSettlements();
    return settlements;
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(): Promise<Array<Object>> {
    const transactions = await this.appService.getSyncTransactions();
    return transactions;
  }

  @UseGuards(JwtAuthGuard)
  @Get('harvests')
  async getHarvests(): Promise<Array<Object>> {
    const harvests = await this.appService.getHarvests();
    return harvests;
  }

  @UseGuards(JwtAuthGuard)
  @Get('rollingreserve')
  async getRollingReserveInfo():Promise<Object> {
    const info = await this.appService.getRollingReserveInfo();
    return info;
  }

  @UseGuards(JwtAuthGuard)
  @Get('systeminfo')
  async getFees():Promise<Object> {
    const info = await this.appService.getSystemInfo();
    return info;
  }

  @UseGuards(JwtAuthGuard)
  @Get('systemstatus')
  async getSystemInfo():Promise<Object> {
    const info = await this.appService.getSystemStatus();
    return info;
  }
}
