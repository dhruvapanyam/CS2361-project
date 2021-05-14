/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {FileSystemWallet, Gateway} = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

/*

Raw TXN:

node invoke.js createRaw <username> <prouct_name> <quantity> <unit_type>


Purchase TXN:

node invoke.js createPurchase <username> <buyerID> <productID> <purchaseID> <quantity>


Production TXN:

node invoke.js createProduction <username> <product_name> "1 2 3 1 2 3..." <quantity> <unit_type>

*/



let choice, user, farmer_name, location, product_name, certification, user_type, metadata, seller, productID, purchaseID, sub_products, buyerID, manufacturer, quantity, unit_type;

process.argv.forEach(function (val, index, array) {
    // console.log(index + ': ' + val);
    choice = array[2];

    if (choice == 'createRaw'){
        user = array[3];
        product_name = array[4];
        quantity = array[5];
        unit_type = array[6];
    }

    else if (choice == 'createPurchase') {
        user = array[3]
        buyerID = array[4]
        productID = array[5]
        purchaseID = array[6]
        quantity = array[7];
    }

    else if (choice == 'createProduction') {
        user = array[3]
        product_name = array[4]
        sub_products = []
        let temp = array[5].split(' ')
        for (let i=0; i < temp.length / 3; i++){
            sub_products.push([temp[3*i],temp[3*i + 1],temp[3*i + 2]])
        }
        quantity = array[6]
        unit_type = array[7]
        // console.log(sub_products)
    }

    else if (choice == 'validatePurchase') {
        user = array[3];
        purchaseID = array[4];
    }

    else {
        console.log('typo')
        throw 'ERROR! Something went wrong.'
    }

});

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
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
        const contract = network.getContract('genesistrail');

        // Submit the specified transaction.
        // createMsg transaction - requires 5 argument, ex: ('createMsg', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
        // flagMsg transaction - requires 2 args , ex: ('flagMsg', 'CAR10', 'Dave')
        if (choice === 'createRaw') {
            // console.log('user type:',user_type)
            await contract.submitTransaction('createRawTransaction', product_name, quantity, unit_type);
            console.log(`${choice} Transaction has been submitted`);

        } 

        else if (choice === 'createPurchase') {
            await contract.submitTransaction('createPurchaseTransaction', buyerID, productID, purchaseID, quantity);     // EDIT (pass anonymous flag value to chaincode)
            console.log(`${choice} Transaction has been submitted`);
        }

        else if (choice === 'createProduction') {
            await contract.submitTransaction('createProductionTransaction', product_name, JSON.stringify(sub_products), quantity, unit_type);     // EDIT (pass anonymous flag value to chaincode)
            console.log(`${choice} Transaction has been submitted`);
        }

        else if (choice === 'validatePurchase') {
            await contract.submitTransaction('validatePurchase', purchaseID);     // EDIT (pass anonymous flag value to chaincode)
            console.log(`${choice} Transaction has been submitted`);
        }

        else {
            throw `${choice} is invalid!`;
        }

        console.log('GENESIS TRAIL OUTPUT:')
        console.log('Success!')

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();