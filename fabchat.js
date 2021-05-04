/*
 * SPDX-License-Identifier: Apache-2.0
 */




 /*
    Dhruva Panyam - 04/04/2021
    All edits for CS2349 A3P2 has been commented within "-------EDIT -------" blocks
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

const getMethods = (obj) => {
    let properties = new Set()
    let currentObj = obj
    do {
      Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return [...properties.keys()].filter(item => typeof obj[item] === 'function')
  }

// txnID of last msg that was posted
let txnID = -1;
// list of users
let users = [];

class FabChat extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');

        const startKey = '0';
        const endKey = '99999';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));
                let msg;
                try {
                    msg = JSON.parse(res.value.value.toString('utf8'));

                    txnID += 1;

                } catch (err) {
                    console.log(err);
                    msg = res.value.value.toString('utf8');
                }
            }

            if (res.done) {
                await iterator.close()
                console.log(`users: ${users}`)
                console.log(`numUsers: ${users.length}`)
                console.log(`lasttxnID: ${txnID}`)
                break;
            }
        }
        console.info('============= END : Initialize Ledger ===========')
    }

    async registerUser(ctx, data) {
        console.info('============= START : registerUser ===========')
        let type = 'user'
        data = JSON.parse(data);
        const txn = {
            type,
            data
        }

        
        console.log('user data:',data);
        txnID += 1;


        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('REGISTERED USER AT KEY:',txnID)
        console.info('============= END : registerUser ===========')

        return JSON.stringify(txnID)
    }

    async createRawTransaction(ctx, product_name) {
        console.info('============= START : createRaw ===========')
        
        

        let cid = new ClientIdentity(ctx.stub)

        let userType, userID, certificate, producer;
    
        userType = cid.getAttributeValue('user_type').toString()
        producer = cid.getAttributeValue('full_name').toString()
        // location = cid.getAttributeValue('location').toString()
        userID = cid.getAttributeValue('userID').toString()
        certificate = cid.getAttributeValue('organic_certificate')
        if (certificate == null) certificate = undefined
        else certificate = certificate.toString()

        console.log('User Type:',userType)
        // console.log('Farmer Name:',farmer_name)
        // console.log('Location:',location)
        console.log('User ID:',userID)
        console.log('Organic Certificate:',certificate)
       
        

        if (userType != 'farmer') {
            console.log('Expected farmer role')
            throw 'non-raw user role'
        }

        /*
        metadata:
            farmer_name,
            location,
            product name

        */
        const metadata = {
            userID: userID,
            product_name: product_name,
            producer: producer
        }

        let type = 'raw'
        let certification = certificate

        const txn = {
            type,
            metadata,
            certification
        }

        

        console.log(`txn type : ${type}`);
        console.log(`product name : ${metadata.product_name}`);
        // console.log(`location  : ${metadata.location}`);
        // console.log(`farmer : ${metadata.farmer_name}`);
        console.log(`certificate : ${certification}`);


        txnID += 1;

        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('CREATED RAW AT KEY:',txnID)

        console.info('============= END : createRaw ===========');
    }

    async createPurchaseTransaction(ctx, seller, productID, purchaseID) {
        console.info('============= START : createPurchase ===========');
        
        

        let cid = new ClientIdentity(ctx.stub);
        let userType,buyer;
        userType = cid.getAttributeValue('user_type').toString()
        buyer = cid.getAttributeValue('userID').toString()
        console.log('User Type:',userType)
        console.log('Buyer:',buyer)

        if (userType != 'vendor' && userType != 'manufacturer') {
            console.log('Expected vendor or manufacturer role')
            throw 'non-purchase user role'
        }

        /*
        metadata:
            buyer,
            seller,
        */
        let product_name = await this.getProductName(ctx, productID)

        const metadata = {
            buyer: buyer,
            seller: seller,
            product_name: product_name
        }

        let type = 'purchase'
        let validated = false;
        if (purchaseID == 'null') purchaseID = null
        const txn = {
            type,
            metadata,
            productID,
            purchaseID,
            validated
        }

        console.log(`txn type : ${type}`);
        console.log(`buyer : ${metadata.buyer}`);
        console.log(`seller  : ${metadata.seller}`);
        console.log(`productID : ${productID}`);
        console.log(`purchaseID : ${purchaseID}`);

        txnID += 1;

        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('CREATED PURCHASE AT KEY:',txnID)
        console.info('============= END : createPurchase ===========');
    }

    async createProductionTransaction(ctx, product_name, sub_products_json) {
        console.info('============= START : createProduction ===========');

        let cid = new ClientIdentity(ctx.stub);
        
        let userType, userID, producer;
        userType = cid.getAttributeValue('user_type').toString()
        producer = cid.getAttributeValue('full_name').toString()
        userID = cid.getAttributeValue('userID').toString()
        console.log('User Type:',userType)
        console.log('User ID:',userID)

        if (userType != 'manufacturer') {
            console.log('Expected manufacturer role')
            throw 'non-production user role'
        }

        const metadata = {
            product_name: product_name,
            userID: userID,
            producer: producer
        }
        const sub_products = JSON.parse(sub_products_json)

        /*
        metadata:
            product_name,
            manufacturer,
        */
        let type = 'production'
        const txn = {
            type,
            metadata,
            sub_products,
        }

        console.log(`txn type : ${type}`);
        // console.log(`manufacturer : ${metadata.manufacturer}`);
        console.log(`sub_products : ${sub_products}`);

        txnID += 1;

        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('CREATED PRODUCTION AT KEY:',txnID)
        console.info('============= END : createProduction ===========');
    }


    // -----------------------------------------------------------------------------------------------------


    /*

    queryTxn:
        input = productID
        output = {
            certificates: [...],
            purchase_history: <Tree_Root>
        }


    */

    async getState(ctx,id) {
        const txnAsBytes = await ctx.stub.getState(id); // get the msg from chaincode state
        if (!txnAsBytes || txnAsBytes.length === 0) {
            throw new Error(`${productID} does not exist.`);
        }
        let entry;
        entry = JSON.parse(txnAsBytes.toString());
        // console.log('PRINTING AT GETSTATE()')
        // console.log(entry)
        return entry;
    }

    async getProductName(ctx,id) {
        let product = await this.getState(ctx,id)
        // if (product.type != 'purcha'){
        //     throw 'received request for product name from purchase txn'
        // }

        // console.log('PRINTING AT GETPRODUCTNAME()')
        // console.log(product)
    
        return product.metadata.product_name
    }

    async expandProduct(ctx,id, purchaseID=null,manufID=null,dict) {
        let product = await this.getState(ctx,id)
    
        if (product.type == 'purchase' || product.type == 'user') {
            throw 'Cannot expand non-product entry!'
        }

        

        // if(manuf.type != 'user'){
        //     throw 'Invalid user entry found!'
        // }

    
        let data = {
            product_name: product.metadata.product_name,
            certification: product.certification,
            manufacturer: {
                userID: product.metadata.userID,
                name: product.metadata.producer
            },
            lifecycle: [],
            sub_products: product.sub_products ? product.sub_products : []
        }
    
    
        if (purchaseID != null && manufID != null) {

            let manuf = await this.getState(ctx, manufID);

            let life = [{
                name: manuf.data.full_name,
                userID: manufID
            }]
            console.log('LIFE',life)
            let cur = purchaseID
            while (cur != null) {
                // console.log('cur:',cur)
                let purchase = await this.getState(ctx,cur)
                // console.log('received purchase:',purchase)
                // cur is a purchase always
                let u = await this.getState(ctx,purchase.metadata.seller)
                life.push({
                    name: u.data.full_name,
                    userID: purchase.metadata.seller
                })
                cur = purchase.purchaseID
            }
            data.lifecycle = life
        }
    
        dict[id] = data
        console.log(data)
    
        if(data.sub_products.length)
            for (let subP of data.sub_products)
                await this.expandProduct(ctx,subP[0],subP[1],product.metadata.userID,dict)
    
       
    }


    async queryMaster(ctx, productID) {
        console.info('============= START : queryProductByID ===========');
        console.log(`querying productID: ${productID}`);
        let temp_id = productID;


        let txn = await this.getState(ctx, productID);
        let lifecycle = []
        if (txn.type == 'purchase') {

            return this.queryMaster(ctx, txn.productID)
            // productID is actually txn.productID
            // so, we find the linked list, and update it once expandProduct returns
            let temp_txn = txn;
            let cur = productID
            while (cur != null){
                lifecycle.push(cur)
                cur = temp_txn.purchaseID;
                temp_txn = await this.getState(ctx, cur);
            }
            // productID = txn.productID
        }


        let dict = {}
        await this.expandProduct(ctx,productID,null,null,dict)

        if (lifecycle.length) {
            dict[temp_id].lifecycle = lifecycle
        }
        
        console.info('============= END : queryProductByID ===========');
        return JSON.stringify(dict);
    }

    async getCertificates(ctx,id) {
        let certificates = []
    
        console.info('============= START : getCertificates ===========');
    
        let product = await this.getState(ctx,id)
        console.log('Product = ',product.metadata)
        if (product.type == 'production') {
            for (let subP of product.sub_products){
                let res = await this.getCertificates(ctx,subP[0])
                console.log('Received:',res,'at:',product.metadata.product_name)
                for (let i=0;i<res.length;i++){
                    // console.log(res[i])
                    res[i].product_path.push(product.metadata.product_name)
                    certificates.push(res[i])
                }
            }
        }
    
        else if (product.type == 'raw') {
            console.info('============= END : getCertificates ===========');
            if (product.certification)
                return [{raw_name: product.metadata.product_name, certificate: product.certification, product_path: [product.metadata.product_name]}]
            else
                return []
        }
    
        console.info('============= END : getCertificates ===========');
        return certificates
    }


    
    async getCertificatesMaster(ctx, id) {
        let certificates = await this.getCertificates(ctx,id)
        return JSON.stringify(certificates)
    }


    async getPendingValidations(ctx) {
        // txnID = number of entries
        console.info('============= START : getPending ===========');
        let cid = new ClientIdentity(ctx.stub);

        console.info('TXN ID:',txnID);
        
        let userType, userID;
        userType = cid.getAttributeValue('user_type').toString()
        userID = cid.getAttributeValue('userID').toString()

        // if(userType != 'vendor' && userType != 'manufacturer'){
        //     return []
        // }

        const startKey = '0';
        const endKey = '99999';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log('valid!',res)
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let txn;
                let ret;
                console.log('Key:',Key);
                try {
                    txn = JSON.parse(res.value.value.toString('utf8'));
                    console.log('Parsed res.value.value:',txn)

                    if (txn.type != 'purchase') continue;

                    if (txn.metadata.seller == userID && txn.validated == false) {
                        let u = await this.getState(ctx,txn.metadata.buyer)
                        if (u.type != 'user') {
                            throw 'Invalid purchase entry found!'
                        }
                        ret = {
                            txnID: Key,
                            product_name: txn.metadata.product_name,
                            buyer: u,
                            productID: txn.productID
                        }
                        console.log('Found 1 pending!',ret)
                    }
                    else{
                        continue;
                    }



                } catch (err) {
                    console.log(err);
                    ret = res.value.value.toString('utf8');
                }
                console.log('pushing:',Key,ret)
                allResults.push(ret);
            }
            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info('============= END : queryAllMsgs ===========');
                return JSON.stringify(allResults);
            }
        }
    }

    async getCompleteChainstate(ctx){
        console.info('============= START : getALL ===========');
        const startKey = '0';
        const endKey = '99999';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log('ID:',res)
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                console.log('Key:',Key)
                let msg;
                try {
                    msg = JSON.parse(res.value.value.toString('utf8'));

                } catch (err) {
                    console.log(err);
                    msg = res.value.value.toString('utf8');
                }
                console.log('pushing:',Key,msg)
                allResults.push({Key, msg});
            }
            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info('============= END : getALL ===========');
                return JSON.stringify(allResults);
            }
        }
    }

    async viewUser(ctx,uID){
        console.info('============= START : viewUser ===========');

        let entry = await this.getState(ctx, uID)

        if(entry.type != 'user'){
            throw 'Cannot view non-user entry!'
        }


        console.info('============= END : viewUser ===========');
        
        return JSON.stringify(entry)
    }

    async validatePurchase(ctx, purID){
        console.info('============= START : validate ===========');

        let entry = await this.getState(ctx,purID);
        if(entry.type != 'purchase'){
            throw 'Cannot validate non-purchase entry!'
        }

        let cid = new ClientIdentity(ctx.stub);
        let userID   = cid.getAttributeValue('userID').toString()

        if(entry.metadata.seller != userID){
            throw 'You do not have permission to validate this purchase!'
        }

        if(entry.validated == true){
            throw 'Purchase has already been validated!'
        }

        entry.validated = true
        await ctx.stub.putState(purID, Buffer.from(JSON.stringify(entry)));

        console.info('============= START : validate ===========');

    }

    

}

module.exports = FabChat;
