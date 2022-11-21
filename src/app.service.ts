import { Injectable, OnModuleInit } from '@nestjs/common';
import moment from 'moment';
import web3, { batchCall, contractInterface, subchain, toNumber } from 'utils/web3';
import util from 'util';
import { InjectModel } from '@nestjs/mongoose';
import { Payin, PayinDocument } from 'schemas/payin.schema';
import { Model } from 'mongoose';
import { Config, ConfigDocument } from 'schemas/config.schema';

const timer = util.promisify(setTimeout);
@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    @InjectModel(Payin.name) private payinModel: Model<PayinDocument>,
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>
  ) {}

  async onModuleInit() {
    console.log(`Fetching data from blockchain...`);
    await this.init_config();
    this.sync_payin();
  }

  async init_config() {
    // await this.configModel.remove({});
    const config = await this.configModel.findOne();
    if(!config) {
      console.log('init config');
      const newConfig = new this.configModel();
      await newConfig.save();
    }
  }

  async sync_payin() {
    const config = await this.configModel.findOne();
    console.log('sync_payin from', config.payin_blocknumber);
    while(true) {
      const events = await subchain.getPastEvents('allEvents', {
        fromBlock: config.payin_blocknumber,
        toBlock: config.payin_blocknumber + 5000
      });
      const filtered = events.filter(each => each.event == 'Request_Payin' || each.event == 'Process_Payin');
      if(filtered.length > 0) {
        console.log("import events", filtered.length);
      }
      for(let each of filtered) {
        try {
          // console.log(each.returnValues.request);
          const newPayinLog = new this.payinModel({
            transactionHash: each.transactionHash,
            requestId: each.returnValues.requestId,
            event: each.event,
            customerId: each.returnValues.request['customerId'],
            amount: web3.utils.fromWei(each.returnValues.request['amount']),
            fee_amount: web3.utils.fromWei(each.returnValues.request['fee_amount']),
            rolling_reserve_amount: web3.utils.fromWei(each.returnValues.request['rolling_reserve_amount']),
            chargebackId: each.returnValues.request['chargebackId'],
            created_at: each.returnValues.request['created_at'] * 1000,
            processed_at: each.returnValues.request['processed_at'] * 1000,
            merchant: each.returnValues.request['merchant'],
            status: each.returnValues.request['status'],
          });
          await newPayinLog.save();
        } catch(e) {
          if(e.code == 11000) continue;
          console.log(e.code, e.message);
        }
      }
      const current_blocknumber = await web3.eth.getBlockNumber();
      config.payin_blocknumber = Math.min(config.payin_blocknumber + 5000, current_blocknumber);
      await config.save();
      if(config.payin_blocknumber % 10 < 2) {
        console.log('sync_payin from', config.payin_blocknumber);
        await timer(2000);
      }
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async getDepositAmount(from = 0, to = Date.now() / 1000): Promise<Number> {
    const result = await this.payinModel.aggregate([
      { $match: { event: { $eq: 'Process_Payin' }, processed_at: { $gte: new Date(from * 1000), $lte: new Date(to * 1000)} } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ])
    return result[0].amount;
  }

  async getCashoutAmount(from = 0, to = Date.now() / 1000): Promise<Number> {
    const result = await this.payinModel.aggregate([
      { $match: { event: { $eq: 'Process_Payin' } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ])
    return 0;
  }

  async getDeposits(index = 0, count = 100): Promise<Array<Object>> {
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
    return results.reverse();
  }


  async getSettlementAmount(from = 0, to = Date.now() / 1000): Promise<Number> {
    if(from == 0) return -1;
    const events = await subchain.getPastEvents('Make_Settlement', {
      fromBlock: 0,
    });
    // const events_filtered = results.filter(({request}) => from <= request.processed_at && request.processed_at <= to);
  }

  async getPayinInfo(from = 0, to = Date.now()): Promise<Object> {
    let results:any = await batchCall(web3, [
      subchain.methods.total_rolling_reserve_amount().call,
      subchain.methods.paid_rolling_reserve_amount().call,
      subchain.methods.totalChargeback().call,
      subchain.methods.totalChargebackPaid().call,
      subchain.methods.total_settled_amount().call,
      subchain.methods.total_payouts_processed().call,

    ]);
    results = results.map(each => Number(web3.utils.fromWei(each)));
    const [total, released, totalChargeback, totalChargebackPaid, settled, total_payouts] = results;
    return {
      total, released, totalChargeback, totalChargebackPaid, settled, total_payouts
    }
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
    return results.reverse();
  }

  async getSyncTransactions(): Promise<Array<Object>> {
    const events = await subchain.getPastEvents('Sync', {
      fromBlock: 0,
    });
    // console.log(events);
    // const results = events.map(each => each.returnValues);
    let [results, blocks] = await Promise.all([
      batchCall(web3, events.map(event => ({func: web3.eth.getTransaction, params:[event.transactionHash]})))
      .then(txs => txs.map(tx => contractInterface.parseTransaction({data: tx['input']}))),
      batchCall(web3, events.map(event => ({func: web3.eth.getBlock, params:[event.blockNumber]})))
    ]);
    let ret = results.map((tx, i) => ({
      txHash: events[i].transactionHash,
      func: tx.name,
      args: tx.functionFragment.inputs.reduce((obj, each) => 
        ( {...obj, 
          [each.name]: tx.args[each.name]._isBigNumber ? 
            (tx.args[each.name].toString().length > 10 ? toNumber(tx.args[each.name]) :Number(tx.args[each.name])) : 
            tx.args[each.name]}), {}),
      timestamp: blocks[i]['timestamp']
    }))    
    // console.log(results);
    return ret.reverse();
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
    return results.reverse();
  }
  
  
  async getHarvests(): Promise<Array<Object>> {
    const events = await subchain.getPastEvents('Harvest', {
      fromBlock: 0,
    });
    // console.log(events);
    const blocks = await batchCall(web3, events.map(event => ({func: web3.eth.getBlock, params:[event.blockNumber]})));
    
    // const results = events.map(each => each.returnValues);
    let results = events.map((event, i) => ({
      explorer: process.env.explorer,
      timestamp: blocks[i]['timestamp'],
      txHash: event.transactionHash, // releaseIndex, uint amount, uint chargeback
      amount: toNumber(event.returnValues['amount']),
      chargeback: toNumber(event.returnValues['chargeback'])
    }))
    return results.reverse();
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
      explorer: process.env.explorer
    }
  }
}
