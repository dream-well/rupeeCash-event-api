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
      explorer: process.env.explorer,
      txHash: event.transactionHash, // releaseIndex, uint amount, uint chargeback
      amount: toNumber(event.returnValues['amount']),
      chargeback: toNumber(event.returnValues['chargeback'])
    }))
    return results;
  }
  
  async getRollingReserveInfo(): Promise<Object> {
    let [total, released, pending, totalChargeback, totalChargebackPaid] = await batchCall(web3, [
      subchain.methods.total_rolling_reserve_amount().call,
      subchain.methods.paid_rolling_reserve_amount().call,
      subchain.methods.get_pending_rolling_reserve().call,
      subchain.methods.totalChargeback().call, 
      subchain.methods.totalChargebackPaid().call, 
    ]);
    return {
      total: toNumber(total), 
      released: toNumber(released), 
      pending: toNumber(pending['pendingAmount']), 
      releaseIndex: pending['releaseIndex'],
      totalChargeback: toNumber(totalChargeback),
      totalChargebackPaid: toNumber(totalChargebackPaid) 
    }
  }
  
  async getSystemInfo(): Promise<Object> {
    let [payinFee, payoutFee, rollingReserve, rollingReservePeriod, 
      minPayin, maxPayin, minPayout, maxPayout, 
      minimum_settlement_amount, payout_payin_ratio_limit, settlement_ratio,
      bscAddress] = await batchCall(web3, [
        subchain.methods.payinFee().call,
        subchain.methods.payoutFee().call,
        subchain.methods.rolling_reserve().call,
        subchain.methods.rolling_reserve_period().call,
        subchain.methods.minPayinAmount().call,
        subchain.methods.maxPayinAmount().call,
        subchain.methods.minPayoutAmount().call,
        subchain.methods.maxPayoutAmount().call,
        subchain.methods.minimum_settlement_amount().call,
        subchain.methods.payout_payin_ratio_limit().call,
        subchain.methods.settlement_ratio().call,
        subchain.methods.bscAddress().call,
    ]);
    return {
      payinFee: toNumber(payinFee, 2), 
      payoutFee: toNumber(payoutFee, 2), 
      rollingReserve: toNumber(rollingReserve, 2), 
      rollingReservePeriod,
      minPayin: toNumber(minPayin),
      maxPayin: toNumber(maxPayin),
      minPayout: toNumber(minPayout),
      maxPayout: toNumber(maxPayout),
      minimum_settlement_amount: toNumber(minimum_settlement_amount, 2),
      payout_payin_ratio_limit: toNumber(payout_payin_ratio_limit, 2),
      settlement_ratio: toNumber(settlement_ratio, 2),
      bscAddress
    }
  }
  
  async getSystemStatus(): Promise<Object> {
    let [maintenanceMode, merchantStatus] = await batchCall(web3, [
      subchain.methods.maintenanceMode().call,
      subchain.methods.merchantStatus().call,
    ]);
    return {
      maintenanceMode: Number(maintenanceMode), 
      merchantStatus: Number(merchantStatus), 
    }
  }
}
