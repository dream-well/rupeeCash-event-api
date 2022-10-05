import { Injectable } from '@nestjs/common';
import moment from 'moment';
import web3, { batchCall, subchain, toNumber } from 'utils/web3';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getDepositAmount(): Promise<Number> {
    const events = await subchain.getPastEvents('Process_Payin', {
      fromBlock: 0,
    });
    // console.log(events);
    const results = events.map(each => each.returnValues);
    const today = moment.utc(moment.utc().format('YYYY-MM-DD')).unix();
    const events_today = results.filter(each => true).map(each => each.request);
    const amount = events_today.map(request => Number(web3.utils.fromWei(request.amount))).reduce((a,b) => a+b);
    return amount;
  }

  async getCashoutAmount(): Promise<Number> {
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
      subchain.methods.total_settled_amount().call,
      subchain.methods.total_payouts_processed().call,

    ]);
    results = results.map(each => Number(web3.utils.fromWei(each)));
    const [total, released, chargeback, settled, total_payouts] = results;
    return {
      total, released, chargeback, settled, total_payouts
    }
  }

  async getDeposits(): Promise<Array<Object>> {
    const events = await subchain.getPastEvents('Process_Payin', {
      fromBlock: 0,
    });
    // console.log(events);
    // const results = events.map(each => each.returnValues);
    const results = events.map(each => each.returnValues).map(each => ({
      requestId: each.requestId,
      customerId: each.request.customerId,
      amount: toNumber(each.request.amount),
      fee_amount: toNumber(each.request.fee_amount),
      rolling_reserve_amount: toNumber(each.request.rolling_reserve_amount),
      status: each.request.status,

    }))
    return results;
  }
  
}
