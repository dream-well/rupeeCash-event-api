import { Injectable, OnModuleInit } from '@nestjs/common';
import moment from 'moment';
import web3, { batchCall, contractInterface, subchain, toNumber } from 'utils/web3';
import util from 'util';
import { InjectModel } from '@nestjs/mongoose';
import { Payin, PayinDocument, PayinStatus } from 'schemas/payin.schema';
import { Model } from 'mongoose';
import { Config, ConfigDocument } from 'schemas/config.schema';
import { Payout, PayoutDocument, PayoutStatus } from 'schemas/payout.schema';
import { Event, EventDocument } from 'schemas/event.schema';
import { Transaction, TransactionDocument } from 'schemas/transaction.schema';

const timer = util.promisify(setTimeout);
@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Payin.name) private payinModel: Model<PayinDocument>,
    @InjectModel(Payout.name) private payoutModel: Model<PayoutDocument>,
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async onModuleInit() {
    console.log(`Fetching data from blockchain...`);
    await this.init_config();
    // this.sync_payin_payout();
    this.sync_transactions();
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

  async sync_payin_payout() {
    const config = await this.configModel.findOne();
    console.log('sync_payin_payout from', config.blocknumber_scan);
    while(true) {
      const current_blocknumber = await web3.eth.getBlockNumber();
      const next_blocknumber = Math.min(config.blocknumber_scan + 10000, current_blocknumber);
      if(next_blocknumber - 1 == config.blocknumber_scan) {
        await timer(2000);
        continue;
      }
      const events = await subchain.getPastEvents('allEvents', {
        fromBlock: config.blocknumber_scan,
        toBlock: next_blocknumber - 1
      });
      const event_names = ['Request_Payin', 'Process_Payin', 'Request_Payout', 'Complete_Payout'];
      const filtered = events.filter(each => event_names.includes(each.event));
      if(filtered.length > 0) {
        console.log("import events", filtered.length);
      }
      for(let each of filtered) {
        try {

          const requestKeys = Object.keys(each.returnValues.request).filter(key => key.length != 1);
          const requestId = each.returnValues.requestId;

          const event = new this.eventModel({
            transactionHash: each.transactionHash,
            name: each.event,
            timestamp: 0,
            params: {
              requestId,
              request: requestKeys.reduce((_, key) => ({ ..._, [key]: each.returnValues.request[key]}), {})
            }
          })
          await event.save();
          
          if(event.name == 'Request_Payin' || event.name == 'Process_Payin') {
            let payin = await this.payinModel.findOne({requestId});

            if(!payin) {
              payin = new this.payinModel({
                requestId: each.returnValues.requestId,
                events: []
              });
            }

            payin.events.push(event);
            payin.customerId = each.returnValues.request['customerId'];
            payin.amount = toNumber(each.returnValues.request['amount']);
            payin.fee_amount = toNumber(each.returnValues.request['fee_amount']);
            payin.rolling_reserve_amount = toNumber(each.returnValues.request['rolling_reserve_amount']);
            payin.chargebackId = each.returnValues.request['chargebackId'];
            payin.created_at = new Date(each.returnValues.request['created_at'] * 1000);
            payin.processed_at = new Date(each.returnValues.request['processed_at'] * 1000);
            payin.merchant = each.returnValues.request['merchant'];
            payin.status = each.returnValues.request['status'];

            await payin.save();
          }
          else if(event.name == 'Request_Payout' || event.name == 'Complete_Payout') {
            let payout = await this.payoutModel.findOne({requestId});

            if(!payout) {
              payout = new this.payoutModel({
                requestId: each.returnValues.requestId,
                events: []
              });
            }

            payout.events.push(event);
            payout.customerId = each.returnValues.request['customerId'];
            payout.amount = toNumber(each.returnValues.request['amount']);
            payout.fee_amount = toNumber(each.returnValues.request['fee_amount']);
            payout.accountInfo = each.returnValues.request['accountInfo'];
            payout.infoHash = each.returnValues.request['infoHash'];
            payout.remark = each.returnValues.request['remark'];
            payout.created_at = new Date(each.returnValues.request['created_at'] * 1000);
            payout.processed_at = new Date(each.returnValues.request['processed_at'] * 1000);
            payout.merchant = each.returnValues.request['merchant'];
            payout.status = each.returnValues.request['status'];

            await payout.save();
          }
          
        } catch(e) {
          console.log(e.code, e.message);
          if(e.code == 11000) continue;
        }
      }
      config.blocknumber_scan = next_blocknumber;
      await config.save();
      if(config.blocknumber_scan % 10 < 2) {
        console.log('sync payin-payout from', config.blocknumber_scan);
        await timer(2000);
      }
    }
  }

  async sync_transactions() {
    const config = await this.configModel.findOne();
    console.log('sync_transactions from', config.tx_scan);
    while(true) {
      const current_blocknumber = await web3.eth.getBlockNumber();
      const next_blocknumber = Math.min(config.tx_scan + 10000, current_blocknumber);
      if(next_blocknumber - 1 == config.tx_scan) {
        await timer(2000);
        continue;
      }
      const events = await subchain.getPastEvents('Sync', {
        fromBlock: config.tx_scan,
        toBlock: next_blocknumber - 1
      });
      let [results, blocks] = await Promise.all([
        batchCall(web3, events.map(event => ({func: web3.eth.getTransaction, params:[event.transactionHash]})))
        .then(txs => txs.map(tx => contractInterface.parseTransaction({data: tx['input']}))),
        batchCall(web3, events.map(event => ({func: web3.eth.getBlock, params:[event.blockNumber]})))
      ]);
      
      let transactions = results.map((tx, i) => new this.transactionModel({
        txHash: events[i].transactionHash,
        func: tx.name,
        args: tx.functionFragment.inputs.reduce((obj, each) => 
          ( {...obj, 
            [each.name]: tx.args[each.name]._isBigNumber ? 
              (tx.args[each.name].toString().length > 10 ? toNumber(tx.args[each.name]) :Number(tx.args[each.name])) : 
              tx.args[each.name]}), {}),
        timestamp: blocks[i]['timestamp']
      }));

      await this.transactionModel.bulkSave(transactions);
      config.tx_scan = next_blocknumber;
      await config.save();
      console.log('sync tx ', config.tx_scan);
    }
  }

  async getDepositAmount(from = 0, to = Date.now() / 1000): Promise<Number> {
    const result = await this.payinModel.aggregate([
      { $match: { status: { $eq: PayinStatus.Paid }, processed_at: { $gte: new Date(from * 1000), $lte: new Date(to * 1000)} } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ])
    if(result.length == 0) return 0;
    return result[0].amount;
  }

  async getCashoutAmount(from = 0, to = Date.now() / 1000): Promise<Number> {
    const result = await this.payoutModel.aggregate([
      { $match: { status: { $eq: PayoutStatus.Paid }, processed_at: { $gte: new Date(from * 1000), $lte: new Date(to * 1000)} } },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ])
    if(result.length == 0) return 0;
    return result[0].amount;
  }

  async getDeposits(index = 0, count = 100): Promise<Array<Object>> {
    let records = await this.payinModel.find({});
    return records.map((each, i) => ({
      requestId: each.requestId,
      customerId: each.customerId,
      amount: each.amount,
      fee_amount: each.fee_amount,
      rolling_reserve_amount: each.rolling_reserve_amount,
      chargebackId: each.chargebackId,
      processed_at: each.processed_at.getTime() / 1000,
      status: each.status,
    })).reverse();
  }

  async getPayouts(): Promise<Array<Object>> {
    let records = await this.payoutModel.find({});
    return records.map((each, i) => ({
      requestId: each.requestId,
      customerId: each.customerId,
      amount: each.amount,
      fee_amount: each.fee_amount,
      accountInfo: each.accountInfo,
      processed_at: each.processed_at.getTime() / 1000,
      remark: each.remark,
      status: each.status,
    })).reverse();
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
      subchain.methods.total_payins_processed().call,
      subchain.methods.total_payouts_processed().call,

    ]);
    results = results.map(each => Number(web3.utils.fromWei(each)));
    const [total, released, totalChargeback, totalChargebackPaid, settled, total_payins, total_payouts] = results;
    return {
      total, released, totalChargeback, totalChargebackPaid, settled, total_payins, total_payouts
    }
  }
  
  async getSyncTransactions(): Promise<Array<Object>> {
    // console.log(results);
    return this.transactionModel.find().select({"_id": 0, "args": 0}).sort('timestamp');
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
      minimum_settlement_amount: toNumber(minimum_settlement_amount, 18),
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
