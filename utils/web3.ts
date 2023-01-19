import Web3 from 'web3';
import fs from 'fs-extra';
import { ethers } from 'ethers';

const web3 = new Web3(process.env.rpc);

function get_abi(name) {
    return fs.readJsonSync(`data/${name}.json`);
}

function get_contract(name, web3_ = web3) {
    const abi = fs.readJsonSync(`data/${name}.json`);
    return new web3_.eth.Contract(abi, process.env[name]);
}

// export const admin = get_contract('admin');
// export const payin = get_contract('payin');
// export const payout = get_contract('payout');
// export const trader = get_contract('trader');

export const admin = get_contract('admin');

export default web3;

export const web3_bsc = new Web3(process.env.bsc_rpc);
export const bsc_admin = get_contract('bsc_admin', web3_bsc);
export const bsc_rupeeCash = get_contract('bsc_rupeeCash', web3_bsc);

export function batchCall(web3, calls) {
    let batch = new web3.BatchRequest();
    let promises = calls.map(call => {
        return new Promise((resolve, reject) => {
            if(call.func) {
                batch.add(call.func.request(...call.params, (error, data) => {
                    error ? reject(error) : resolve(data)
                }));
                return;
            }
            let request = call.request({}, (error, data) => 
                error ? reject(error) : resolve(data)
            );
            batch.add(request);
        });
    });

    batch.execute();

    return Promise.all(promises);
}

export const toNumber = (bn, decimals = 18) => Number(ethers.utils.formatUnits(bn, decimals));
let admin_abi = get_abi('admin');
let payin_abi = get_abi('payin');
let payout_abi = get_abi('payout');
let trader_abi = get_abi('trader');
let rupeecash_abi = get_abi('rupeeCash');

const abis = [...admin_abi, ...payin_abi, ...payout_abi, ...trader_abi, ...rupeecash_abi].filter((each, i, arr) => !arr.find((e, j) => e.name == each.name && j > i));
// console.log(abis);
export const contractInterface = new ethers.utils.Interface(abis);
export const bscContractInterface = new ethers.utils.Interface(get_abi('bsc_admin'));
