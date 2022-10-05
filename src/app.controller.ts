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
      chargeback: info['chargeback'],
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
}
