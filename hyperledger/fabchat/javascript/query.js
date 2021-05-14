/*
 * SPDX-License-Identifier: Apache-2.0
 */



 /*

Query Request:

node query.js <username> <productID> <choice>
choice = "certificates" or "history"

 */

'use strict';

const {FileSystemWallet, Gateway, BaseCheckpointer} = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
let productID;
let user;
let choice;
let pwd;

process.argv.forEach(function (val, index, array) {
    // console.log(index + ': ' + val);
    productID = array[3];
    user = array[2];
    choice = array[4];
    if(choice == 'login')
        pwd = productID;
});

function printOutput(out){
    console.log('GENESIS TRAIL OUTPUT:')

    console.log(JSON.stringify(JSON.parse(out)));
}

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        console.log(__dirname)
        console.log('path:',path.resolve(__dirname))
        const walletPath = path.join(path.resolve(__dirname), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(user);
        if (!userExists) {
            console.log(`An identity for the user ${user} does not exist in the wallet`);
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: user, discovery: {enabled: false}});

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabchat');

        // Evaluate the specified transaction.
        // console.log('CHOICE:',choice)
        if(choice == 'certificates'){
            const result = await contract.evaluateTransaction('getCertificates',productID);
            printOutput(result)
        }
        else if(choice == 'pending'){
            const result = await contract.evaluateTransaction('getPendingValidations');
            printOutput(result)
        }
        else if(choice == 'txnHistory'){
            const result = await contract.evaluateTransaction('getTxnHistory');
            printOutput(result)
        }
        else if(choice == 'storage'){
            const result = await contract.evaluateTransaction('getStorage');
            printOutput(result)
        }
        else if(choice == 'getAll'){
            const result = await contract.evaluateTransaction('getCompleteChainstate',user);
            printOutput(result)
        }
        else if(choice == 'viewUser'){
            const result = await contract.evaluateTransaction('viewUser',productID);
            printOutput(result)
        }
        else if(choice == 'history'){
            const result = await contract.evaluateTransaction('queryMaster', productID);
            printOutput(result)
        }
        else if(choice == 'login'){
            await gateway.connect(ccp, {wallet, identity: 'admin', discovery: {enabled: false}});
            const ca = gateway.getClient().getCertificateAuthority();
            const adminIdentity = gateway.getCurrentIdentity();

            const identityService = ca.newIdentityService();
            // console.log('reached here')
            const retrieveIdentity = await identityService.getOne(user,adminIdentity)
            for(let attr of retrieveIdentity.result.attrs){
                if(attr.name != 'password') continue
                if(attr.value == pwd){
                    console.log('GENESIS TRAIL OUTPUT:')
                    console.log('PERMISSION GRANTED!')
                }
                else{
                    console.log('GENESIS TRAIL OUTPUT:')
                    console.log('PERMISSION DENIED!')
                }
            }
        }        
        else{
            throw 'Invalid choice!'
        }

        

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

main();
