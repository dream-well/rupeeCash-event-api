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
    let events: any = await subchain.getPastEvents('Request_Payin', {
      fromBlock: 0,
    });
    // console.log(events);
    // const results = events.map(each => each.returnValues);
    events = events.map(event => event.returnValues);
    let results: any = await batchCall(web3, events.map(event => subchain.methods.payInRequests(event.requestId).call));
    results = results.map((each, i) => ({
      requestId: events[i].requestId,
      customerId: each.customerId,
      amount: toNumber(each.amount),
      fee_amount: toNumber(each.fee_amount),
      rolling_reserve_amount: toNumber(each.rolling_reserve_amount),
      chargebackId: Number(each.chargebackId),
      processed_at: Number(each.processed_at),
      remark: each.remark,
      status: each.status,
      
    }))
    return results;
  }
  
  async getPayouts(): Promise<Array<Object>> {
    let events: any = await subchain.getPastEvents('Request_Payout', {
      fromBlock: 0,
    });
    // console.log(events);
    // const results = events.map(each => each.returnValues);
    events = events.map(event => event.returnValues);
    let results: any = await batchCall(web3, events.map(event => subchain.methods.payOutRequests(event.requestId).call));
    results = results.map((each, i) => ({
      requestId: events[i].requestId,
      customerId: each.customerId,
      amount: toNumber(each.amount),
      fee_amount: toNumber(each.fee_amount),
      accountInfo: each.accountInfo,
      processed_at: Number(each.processed_at),
      remark: each.remark,
      status: each.status,
      
    }))
    return results;
  }
  
  async getSettlements(): Promise<Array<Object>> {
    let events: any = await subchain.getPastEvents('Make_Settlement', {
      fromBlock: 0,
    });
    // console.log(events);
    // const results = events.map(each => each.returnValues);
    events = events.map(event => event.returnValues);
    let results: any = await batchCall(web3, events.map(event => subchain.methods.settlements(event.subSettlementId).call));
    results = results.map((each, i) => ({
      subSettlementId: events[i].subSettlementId,
      id: each.id,
      amount: toNumber(each.amount),
      createdAt: each.createdAt,
      status: each.status,
    }))
    return results;
  }
  
  
  async getHarvests(): Promise<Array<Object>> {
    const events = await subchain.getPastEvents('Harvest', {
      fromBlock: 0,
    });
    // console.log(events);
    
    // const results = events.map(each => each.returnValues);
    let results = events.map((event, i) => ({
      txHash: event.transactionHash, // releaseIndex, uint amount, uint chargeback
      amount: event.returnValues['amount'],
      chargeback: event.returnValues['chargeback']
    }))
    return results;
  }
  
  async getRollingReserveInfo(): Promise<Object> {
    let results:any = await batchCall(web3, [
      subchain.methods.total_rolling_reserve_amount().call,
      subchain.methods.paid_rolling_reserve_amount().call,
      subchain.methods.get_pending_rolling_reserve().call,
    ]);
    const [total, released, pending] = results;
    return {
      total: toNumber(total), 
      released: toNumber(released), 
      pending: toNumber(pending.pendingAmount), 
      releaseIndex: pending.releaseIndex
    }
  }
}
