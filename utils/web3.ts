import Web3 from 'web3';
import fs from 'fs-extra';
import { ethers } from 'ethers';

const web3 = new Web3(process.env.rpc);

function get_abi(name) {
    return fs.readJsonSync(`data/${name}.json`);
}

function get_contract(name) {
    const abi = fs.readJsonSync(`data/${name}.json`);
    return new web3.eth.Contract(abi, process.env[name]);
}

// export const admin = get_contract('admin');
// export const payin = get_contract('payin');
// export const payout = get_contract('payout');
// export const trader = get_contract('trader');

export const subchain = get_contract('subchain');

export default web3;


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

export const contractInterface = new ethers.utils.Interface(get_abi('subchain'));
