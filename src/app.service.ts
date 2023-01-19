import { Injectable, OnModuleInit } from '@nestjs/common';
import moment from 'moment';
import web3, { batchCall, contractInterface, admin, toNumber, web3_bsc, bsc_admin, bscContractInterface } from 'utils/web3';
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
    this.sync_transactions();
    this.listen_bsc_admin();
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


  async sync_transactions() {
    const config = await this.configModel.findOne();
    console.log('sync_transactions from', config.event_scan);
    while(true) {
      const current_blocknumber = await web3.eth.getBlockNumber();
      const next_blocknumber = Math.min(config.event_scan + 10000, current_blocknumber);
      if(next_blocknumber - 1 == config.event_scan) {
        await timer(2000);
        continue;
      }
      let events = await admin.getPastEvents('allEvents', {
        fromBlock: config.event_scan,
        toBlock: next_blocknumber - 1
      });

      events = events.filter(event => event.event && event.event != 'OwnershipTransferred' && event.event != 'Initialized' && event.event != 'Sync_Main_Chain');
      if(events.length) {
        console.log(events.map(event => event.event));
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
  
        try{
          await this.transactionModel.bulkSave(transactions);
        } catch(e) {
          console.error(e);
        }
  
        let eventRecords = events.map((event, i) => new this.eventModel({
          txHash: event.transactionHash,
          name: event.event,
          timestamp: blocks[i]['timestamp'],
          params: event.returnValues,
          firstParam: event.returnValues["0"]
        }));
  
        try{
          await this.eventModel.bulkSave(eventRecords);
        } catch(e) {
          console.error(e);
        }
      }

      config.event_scan = next_blocknumber;
      await config.save();
      console.log('sync tx ', config.event_scan);
    }
  }
  
  async listen_bsc_admin() {
    const config = await this.configModel.findOne();
    console.log('listen_bsc_admin from', config.bsc_scan);
    config.bsc_scan = 26351048;
    while(true) {
      const current_blocknumber = await web3_bsc.eth.getBlockNumber();
      const next_blocknumber = Math.min(config.bsc_scan + 3000, current_blocknumber);
      if(next_blocknumber - 1 <= config.bsc_scan) {
        await timer(5000);
        continue;
      }
      // Auto_Settlement_Transfer(address indexed to, uint indexed settlement_id, string indexed private_tx_hash, uint amount, bool auto_exchange)
      let events = await bsc_admin.getPastEvents('Auto_Settlement_Transfer', {
        fromBlock: config.bsc_scan,
        toBlock: next_blocknumber - 1
      });

      if(events.length) {
        const transactions = await batchCall(web3_bsc, events.map(event => ({func: web3_bsc.eth.getTransaction, params:[event.transactionHash]})))
        .then(txs => txs.map(tx => bscContractInterface.parseTransaction({data: tx['input']})));
        const tx_hashes = transactions.map((tx: any, i) => new this.transactionModel({
          txHash: events[i].transactionHash,
          func: tx.name,
          args: tx.functionFragment.inputs.reduce((obj, each) => 
            ( {...obj, 
              [each.name]: tx.args[each.name]._isBigNumber ? 
                (tx.args[each.name].toString().length > 10 ? toNumber(tx.args[each.name]) :Number(tx.args[each.name])) : 
                tx.args[each.name]}), {}),
        })).map(tx => tx.args['private_tx_hash']);
        console.log(tx_hashes)
        let eventRecords = await this.eventModel.find({ txHash: {$in: tx_hashes }});
        for(let event of eventRecords) {
          event.status = "Processed";
        }
        console.log(eventRecords);
        await this.eventModel.bulkSave(eventRecords);
      }

      config.bsc_scan = next_blocknumber;
      await config.save();
      console.log('sync bsc tx ', config.bsc_scan);
    }
  }

  async listen_bsc_rupeeCash() {
    const config = await this.configModel.findOne();
    console.log('listen_bsc_admin from', config.bsc_rupeecash_scan);
    config.bsc_rupeecash_scan = 26351048;
    while(true) {
      const current_blocknumber = await web3_bsc.eth.getBlockNumber();
      const next_blocknumber = Math.min(config.bsc_rupeecash_scan + 3000, current_blocknumber);
      if(next_blocknumber - 1 <= config.bsc_rupeecash_scan) {
        await timer(5000);
        continue;
      }
      // event Create_RupeeCash_Busd_Swap_Request(uint indexed requestId, Request request);
      let events = await bsc_admin.getPastEvents('Create_RupeeCash_Busd_Swap_Request', {
        fromBlock: config.bsc_rupeecash_scan,
        toBlock: next_blocknumber - 1
      });

      if(events.length) {
        const transactions = await batchCall(web3_bsc, events.map(event => ({func: web3_bsc.eth.getTransaction, params:[event.transactionHash]})))
        .then(txs => txs.map(tx => bscContractInterface.parseTransaction({data: tx['input']})));
        const tx_hashes = transactions.map((tx: any, i) => new this.transactionModel({
          txHash: events[i].transactionHash,
          func: tx.name,
          args: tx.functionFragment.inputs.reduce((obj, each) => 
            ( {...obj, 
              [each.name]: tx.args[each.name]._isBigNumber ? 
                (tx.args[each.name].toString().length > 10 ? toNumber(tx.args[each.name]) :Number(tx.args[each.name])) : 
                tx.args[each.name]}), {}),
        })).map(tx => tx.args['private_tx_hash']);
        console.log(tx_hashes)
        let eventRecords = await this.eventModel.find({ txHash: {$in: tx_hashes }});
        for(let event of eventRecords) {
          event.status = "Processed";
        }
        console.log(eventRecords);
        await this.eventModel.bulkSave(eventRecords);
      }

      config.bsc_rupeecash_scan = next_blocknumber;
      await config.save();
      console.log('sync bsc-rupeecash tx ', config.bsc_rupeecash_scan);
    }
  }

  
  async getSyncTransactions(): Promise<Array<Object>> {
    // console.log(results);
    return this.transactionModel.find().select({"_id": 0, "args": 0}).sort([['timestamp', -1]]);
  }

  async getEvents(query, limit = 100, offset = 0): Promise<Array<Object>> {
    // console.log(results);
    return this.eventModel.find(query).skip(offset).limit(limit).sort([['timestamp', -1]]);
  }
  
  async getSystemStatus(): Promise<Object> {
    let [maintenanceMode, merchantStatus] = await batchCall(web3, [
      admin.methods.maintenanceMode().call,
      admin.methods.merchantStatus().call,
    ]);
    return {
      maintenanceMode: Number(maintenanceMode), 
      merchantStatus: Number(merchantStatus), 
      explorer: process.env.explorer
    }
  }
}
