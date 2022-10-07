import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard')
  async getDashboard(): Promise<Object> {
    const [deposits, cashouts, info] = await Promise.all([
      this.appService.getDepositAmount(),
      this.appService.getCashoutAmount(),
      this.appService.getPayinInfo()
    ])
    const pending = 0;
    return {
      deposits, cashouts: info['total_payouts'], 
      rollingReserve: { total: info['total'], released: info['released'] },
      totalChargeback: info['totalChargeback'],
      totalChargebackPaid: info['totalChargebackPaid'],
      settlements: { pending: 0, settled: info['settled'] - pending }
    }
  }

  @Get('deposits')
  async getDeposits(): Promise<Array<Object>> {
    const deposits = await this.appService.getDeposits();
    return deposits;
  }

  @Get('payouts')
  async getPayouts(): Promise<Array<Object>> {
    const payouts = await this.appService.getPayouts();
    return payouts;
  }

  @Get('settlements')
  async getSettlements(): Promise<Array<Object>> {
    const settlements = await this.appService.getSettlements();
    return settlements;
  }

  @Get('transactions')
  async getTransactions(): Promise<Array<Object>> {
    const transactions = await this.appService.getSyncTransactions();
    return transactions;
  }

  @Get('harvests')
  async getHarvests(): Promise<Array<Object>> {
    const harvests = await this.appService.getHarvests();
    return harvests;
  }

  @Get('rollingreserve')
  async getRollingReserveInfo():Promise<Object> {
    const info = await this.appService.getRollingReserveInfo();
    return info;
  }

  @Get('systeminfo')
  async getFees():Promise<Object> {
    const info = await this.appService.getSystemInfo();
    return info;
  }

  @Get('systemstatus')
  async getSystemInfo():Promise<Object> {
    const info = await this.appService.getSystemStatus();
    return info;
  }
}
