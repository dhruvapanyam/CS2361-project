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
        let txn_history = [];
        let txn_pending = [];
        const txn = {
            type,
            data,
            txn_history,
            txn_pending
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

        let user_entry = await this.getState(ctx, userID);
        user_entry.txn_history.push({
            type: 'raw',
            txnID: txnID
        })

        await ctx.stub.putState(userID.toString(), Buffer.from(JSON.stringify(user_entry)));
        console.log("UPDATED USER #",userID,"'S HISTORY")



        console.info('============= END : createRaw ===========');
    }

    async createPurchaseTransaction(ctx, buyerID, productID, purchaseID) {
        console.info('============= START : createPurchase ===========');
        
        

        let cid = new ClientIdentity(ctx.stub);
        let userType,sellerID;
        userType = cid.getAttributeValue('user_type').toString()
        sellerID = cid.getAttributeValue('userID').toString()
        console.log('User Type:',userType)
        console.log('Seller:',sellerID)
        console.log('Buyer:',buyerID)

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
            buyer: buyerID,
            seller: sellerID,
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
        console.log(`buyer : ${metadata.buyerID}`);
        console.log(`seller  : ${metadata.sellerID}`);
        console.log(`productID : ${productID}`);
        console.log(`purchaseID : ${purchaseID}`);

        txnID += 1;

        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('CREATED PURCHASE AT KEY:',txnID)


        /*

        Here, we need to update seller and buyer

        Seller: Append to txn history
        Buyer: Append to pending txns (once they validate, it'll go to their txn history)

        */

        let seller_entry = await this.getState(ctx, sellerID);
        seller_entry.txn_history.push({
            type:'sold',
            txnID:txnID
        })

        await ctx.stub.putState(sellerID.toString(), Buffer.from(JSON.stringify(seller_entry)));
        console.log("UPDATED USER #",sellerID,"'S HISTORY")

        let buyer_entry = await this.getState(ctx, buyerID);
        buyer_entry.txn_pending.push({
            type:'bought',
            txnID:txnID
        })

        await ctx.stub.putState(buyerID.toString(), Buffer.from(JSON.stringify(buyer_entry)));
        console.log("UPDATED USER #",buyerID,"'S PENDING")


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

        let user_entry = await this.getState(ctx, userID);
        user_entry.txn_history.push({
            type: 'production',
            txnID: txnID
        })

        await ctx.stub.putState(userID.toString(), Buffer.from(JSON.stringify(user_entry)));
        console.log("UPDATED USER #",userID,"'S HISTORY")

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

        let user_entry = await this.getState(ctx, userID);
        let results = []
        for(let txn of user_entry.txn_pending){
            let pend_pur = await this.getState(ctx, txn.txnID) // purchaseID
            if(pend_pur.type != 'purchase'){
                throw 'Something went wrong! (getPendingValidiations)'
            }

            results.push({
                seller: pend_pur.metadata.seller,
                productID: pend_pur.productID,
                product_name: pend_pur.metadata.product_name
            })
        }
        console.info('============ END : getPending ============')
        return JSON.stringify(results)
    }

    async getTxnHistory(ctx) {
        // txnID = number of entries
        console.info('============= START : getPending ===========');
        let cid = new ClientIdentity(ctx.stub);

        console.info('TXN ID:',txnID);
        
        let userType, userID;
        userType = cid.getAttributeValue('user_type').toString()
        userID = cid.getAttributeValue('userID').toString()

        let user_entry = await this.getState(ctx, userID);
        let results = []
        for(let txn of user_entry.txn_history){
            let hist = await this.getState(ctx, txn.txnID) // purchaseID
            if(hist.type == 'bought')
                results.push({
                    type: hist.type,
                    seller: hist.metadata.seller,
                    txnID: txn.txnID,
                    productID: hist.productID,
                    product_name: hist.metadata.product_name
                })
            
            else if(hist.type == 'sold')
                results.push({
                    type: hist.type,
                    buyer: hist.metadata.buyer,
                    txnID: txn.txnID,
                    productID: hist.productID,
                    product_name: hist.metadata.product_name
                })
            else if(hist.type == 'raw')
                results.push({
                    type: hist.type,
                    txnID: txn.txnID,
                    product_name: hist.metadata.product_name
                })
            else if(hist.type == 'production'){

                let subp = []
                for(let sub of hist.sub_products){
                    let pname = await this.getProductName(ctx, sub[0])
                    subp.push({
                        productID: sub[0],
                        product_name: pname,
                        purchaseID: sub[1]
                    })
                }

                results.push({
                    type: hist.type,
                    txnID: txn.txnID,
                    product_name: hist.metadata.product_name,
                    sub_products: subp
                })
            }
        }
        console.info('============ END : getPending ============')
        return JSON.stringify(results)
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
    }getPendingValidations

    async validatePurchase(ctx, purID){
        console.info('============= START : validate ===========');

        let purchase_entry = await this.getState(ctx, purID);
        if(purchase_entry.type != 'purchase'){
            throw 'Cannot validate non-purchase entry!'
        }

        if (purchase_entry.validated){
            throw 'Purchase has already been validated!'
        }

        let cid = new ClientIdentity(ctx.stub);
        let userID   = cid.getAttributeValue('userID').toString()

        if (purchase_entry.buyer != userID) {
            throw 'You cannot validate this purchase!'
        }

        purchase_entry.validated = true;

        let user_entry = await this.getState(ctx, userID);

        let txn;
        for(let i=0; i < user_entry.txn_pending.length; i++){
            if (user_entry.txn_pending[i].txnID == purID){
                txn = user_entry.txn_pending[i];
                user_entry.txn_pending = user_entry.txn_pending.filter((x,j) => j!=i)
                break
            }
        }

        user_entry.txn_history.push(txn);

        await ctx.stub.putState(userID.toString(), Buffer.from(JSON.stringify(user_entry)));
        console.log("UPDATED USER #",userID,"'S HISTORY")

        console.info('============= START : validate ===========');

    }

    

}

module.exports = FabChat;
