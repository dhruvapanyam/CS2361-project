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

node invoke.js createRaw <username> "<farmer_name> <location> <product_name>" <certification> farmer


Purchase TXN:

node invoke.js createPurchase <username> "<buyer> <seller>" <rawID> <prev_purchase> vendor


Production TXN:

node invoke.js createProduction <username> "<product_name> <manufacturer>" "<rawID> <purID>" "..." "..."

*/



let choice, user, farmer_name, location, product_name, certification, user_type, metadata, seller, productID, purchaseID, sub_products, buyer, manufacturer;

process.argv.forEach(function (val, index, array) {
    // console.log(index + ': ' + val);
    choice = array[2];

    if (choice == 'createRaw'){
        user = array[3];
        let meta = array[4].split(' ')
        farmer_name = meta[0]
        location = meta[1]
        product_name = meta[2]
        certification = array[5]
        user_type = array[6]

        metadata = {
            farmer_name,
            location,
            product_name
        }

    }

    else if (choice == 'createPurchase') {
        user = array[3]
        let meta = array[4].split(' ')
        buyer = meta[0];
        seller = meta[1]
        productID = array[5]
        purchaseID = array[6]
        // if (purchaseID == 'null') purchaseID = null
        user_type = array[7]

        metadata = {
            buyer,
            seller
        }

    }

    else if (choice == 'createProduction') {
        user = array[3]
        let meta = array[4].split(' ')
        product_name = meta[0]
        manufacturer = meta[1];
        
        metadata = {
            product_name,
            manufacturer
        }
        sub_products = []
        for (let i=5; i < array.length; i++){
            sub_products.push(array[i].split(' '))
        }
        console.log(sub_products)

        user_type = 'manufacturer'
    }

    else {
        console.log('typo')
        throw 'go die'
    }

});

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
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

        // Submit the specified transaction.
        // createMsg transaction - requires 5 argument, ex: ('createMsg', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
        // flagMsg transaction - requires 2 args , ex: ('flagMsg', 'CAR10', 'Dave')
        if (choice === 'createRaw') {
            console.log('user type:',user_type)
            await contract.submitTransaction('createRawTransaction', JSON.stringify(metadata), certification, user_type);     // EDIT (pass anonymous flag value to chaincode)
            console.log(`${choice} Transaction has been submitted`);

        } 

        else if (choice === 'createPurchase') {
            console.log('user type:',user_type)
            await contract.submitTransaction('createPurchaseTransaction', JSON.stringify(metadata), productID, purchaseID, user_type);     // EDIT (pass anonymous flag value to chaincode)
            console.log(`${choice} Transaction has been submitted`);
        }

        else if (choice === 'createProduction') {
            console.log('user type:',user_type)
            await contract.submitTransaction('createProductionTransaction', JSON.stringify(metadata), JSON.stringify(sub_products), user_type);     // EDIT (pass anonymous flag value to chaincode)
            console.log(`${choice} Transaction has been submitted`);
        }

        else {
            console.log(`${choice} is invalid!`);
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();