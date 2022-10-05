import { Injectable } from '@nestjs/common';
import moment from 'moment';
import web3, { batchCall, subchain } from 'utils/web3';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getDeposits(): Promise<Number> {
    const events = await subchain.getPastEvents('Process_Payin', {
      fromBlock: 0,
    });
    console.log(events);
    const results = events.map(each => each.returnValues);
    const today = moment.utc(moment.utc().format('YYYY-MM-DD')).unix();
    const events_today = results.filter(each => true).map(each => each.request);
    const amount = events_today.map(request => Number(web3.utils.fromWei(request.amount))).reduce((a,b) => a+b);
    return amount;
  }

  async getCashouts(): Promise<Number> {
    const events = await subchain.getPastEvents('Complete_Payout', {
      fromBlock: 0,
    });
    const results = events.map(each => each.returnValues);
    const today = moment.utc(moment.utc().format('YYYY-MM-DD')).unix();
    const events_today = results.filter(each => true).map(each => each.request);
    const amount = events_today.map(request => Number(web3.utils.fromWei(request.amount))).reduce((a,b) => a+b);
    return amount;
  }

  async getPayinInfo(): Promise<Object> {
    let results:any = await batchCall(web3, [
      subchain.methods.total_rolling_reserve_amount().call,
      subchain.methods.paid_rolling_reserve_amount().call,
      subchain.methods.totalChargeback().call,
      subchain.methods.total_settled_amount().call
    ]);
    results = results.map(each => Number(web3.utils.fromWei(each)));
    const [total, released, chargeback, settled] = results;
    return {
      total, released, chargeback, settled
    }
  }
}
