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
      this.appService.getDeposits(),
      this.appService.getCashouts(),
      this.appService.getPayinInfo()
    ])
    return {
      deposits, cashouts, 
      rollingReserve: { total: info['total'], released: info['released'] },
      chargeback: info['chargeback'],
      settlements: { pending: 0, settled: 0 }
    }
  }
}
