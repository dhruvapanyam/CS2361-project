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

// msgID of last msg that was posted
let msgID = -1;
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

                    // update users array and msgID
                    if (msg.msgText === "$HELLO$") {
                        users.push(msg.userID);
                    }

                    msgID += 1;

                } catch (err) {
                    console.log(err);
                    msg = res.value.value.toString('utf8');
                }
            }

            if (res.done) {
                await iterator.close();
                console.log(`users: ${users}`);
                console.log(`numUsers: ${users.length}`);
                console.log(`lastMsgID: ${msgID}`);
                break;
            }
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async createRawTransaction(ctx, metadata_json, certification, userType) {
        console.info('============= START : createRaw ===========');
        
        if (userType != 'farmer') {
            throw 'go die'
        }

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const metadata = JSON.parse(metadata_json)

        /*
        metadata:
            farmer_name,
            location,
            product name

        */
        let type = 'raw'
        const txn = {
            type,
            metadata,
            certification
        }

        console.log(`txn type : ${type}`);
        console.log(`product name : ${metadata.product_name}`);
        console.log(`location  : ${metadata.location}`);
        console.log(`farmer : ${metadata.farmer_name}`);
        console.log(`certificate : ${certification}`);

        // if new user, add user to users array
        if (!(users.includes(userID))) {
            console.log(`New user! Added to users array.`);
            users.push(userID);
        }

        msgID += 1;

        await ctx.stub.putState(msgID.toString(), Buffer.from(JSON.stringify(txn)));
        console.info('============= END : createRaw ===========');
    }

    async createPurchaseTransaction(ctx, metadata_json, productID, purchaseID, userType) {
        console.info('============= START : createPurchase ===========');
        
        if (userType != 'vendor' && userType != 'manufacturer') {
            throw 'go die'
        }

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const metadata = JSON.parse(metadata_json)

        /*
        metadata:
            buyer,
            seller,
        */
        let type = 'purchase'
        if (purchaseID == 'null') purchaseID = null
        const txn = {
            type,
            metadata,
            productID,
            purchaseID
        }

        console.log(`txn type : ${type}`);
        console.log(`buyer : ${metadata.buyer}`);
        console.log(`seller  : ${metadata.seller}`);
        console.log(`productID : ${productID}`);
        console.log(`purchaseID : ${purchaseID}`);

        // if new user, add user to users array
        if (!(users.includes(userID))) {
            console.log(`New user! Added to users array.`);
            users.push(userID);
        }

        msgID += 1;

        await ctx.stub.putState(msgID.toString(), Buffer.from(JSON.stringify(txn)));
        console.info('============= END : createPurchase ===========');
    }

    async createProductionTransaction(ctx, metadata_json, sub_products_json, userType) {
        console.info('============= START : createProduction ===========');
        
        if (userType != 'manufacturer') {
            throw 'go die'
        }

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const metadata = JSON.parse(metadata_json)
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
        console.log(`manufacturer : ${metadata.manufacturer}`);
        console.log(`sub_products : ${sub_products}`);

        // if new user, add user to users array
        if (!(users.includes(userID))) {
            console.log(`New user! Added to users array.`);
            users.push(userID);
        }

        msgID += 1;

        await ctx.stub.putState(msgID.toString(), Buffer.from(JSON.stringify(txn)));
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
            throw new Error(`${productID} does not exist. go die`);
        }
        let entry;
        entry = JSON.parse(txnAsBytes.toString());
        console.log('PRINTING AT GETSTATE()')
        console.log(entry)
        return entry;
    }

    async getProductName(ctx,id) {
        let product = await this.getState(ctx,id)
        if (product.type == 'purchase'){
            throw 'go die'
        }

        console.log('PRINTING AT GETPRODUCTNAME()')
        console.log(product)
    
        return product.metadata.product_name
    }

    async expandProduct(ctx,id, purchaseID=null,manuf=null,dict) {
        let product = await this.getState(ctx,id)
    
        if (product.type == 'purchase') {
            throw 'go die af'
        }
    
        let data = {
            product_name: product.metadata.product_name,
            lifecycle: [],
            sub_products: product.sub_products ? product.sub_products : []
        }
    
    
        if (purchaseID != null) {
            let life = [manuf]
            console.log('LIFE',life)
            let cur = purchaseID
            while (cur != null) {
                // console.log('cur:',cur)
                let purchase = await this.getState(ctx,cur)
                // console.log('received purchase:',purchase)
                // cur is a purchase always
                life.push(purchase.metadata.seller)
                cur = purchase.purchaseID
            }
            data.lifecycle = life
        }
    
        dict[id] = data
        console.log(data)
    
        if(data.sub_products.length)
            for (let subP of data.sub_products)
                await this.expandProduct(ctx,subP[0],subP[1],product.metadata.manufacturer,dict)
    
       
    }


    async queryMaster(ctx, productID) {
        console.info('============= START : queryProductByID ===========');
        console.log(`querying productID: ${productID}`);


        let dict = {}
        await this.expandProduct(ctx,productID,null,null,dict)
        
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
                    console.log(res[i])
                    res[i].product_path.push(product.metadata.product_name)
                    certificates.push(res[i])
                }
            }
        }
    
        else if (product.type == 'raw') {
            console.info('============= END : getCertificates ===========');
            return [{raw_name: product.metadata.product_name, certificate: product.certification, product_path: [product.metadata.product_name]}]
        }
    
        console.info('============= END : getCertificates ===========');
        return certificates
    }


    
    async getCertificatesMaster(ctx, id) {
        let certificates = await this.getCertificates(ctx,id)
        return JSON.stringify(certificates)
    }

    async queryAllMsgs(ctx) {
        console.info('============= START : queryAllMsgs ===========');

        const startKey = '0';
        const endKey = '99999';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let msg;
                try {
                    msg = JSON.parse(res.value.value.toString('utf8'));

                    // don't show registration $HELLO$ records
                    if (msg.msgText === "$HELLO$") {
                        continue;
                    }

                    // don't show email ID if flag is not -1 and post is not anonymous
                    // ------------------------ EDIT ----------------------------
                    if (msg.flag !== -1 && msg.anonymous == 1) {
                        delete msg.emailID;
                    }
                    // ----------------------------------------------------------

                    // no need to show these fields anyway
                    delete msg.userID;
                    delete msg.flag;
                    delete msg.flaggers;
                    // ------------------------ EDIT ----------------------------
                    delete msg.anonymous;
                    // ----------------------------------------------------------

                } catch (err) {
                    console.log(err);
                    msg = res.value.value.toString('utf8');
                }
                allResults.push({Key, msg});
            }
            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info('============= END : queryAllMsgs ===========');
                return JSON.stringify(allResults);
            }
        }
    }

    async flagMsg(ctx, msgID) {
        console.info('============= START : flagMsg ===========');

        let cid = new ClientIdentity(ctx.stub);
        let flagger = cid.getID();
        let threshold = Math.ceil(0.5 * users.length);

        console.log(`numUsers: ${users.length}`);
        console.log(`threshold: ${threshold}`);
        console.log(`msgID: ${msgID}`);
        console.log(`flagger  : ${flagger}`);

        const msgAsBytes = await ctx.stub.getState(msgID); // get the msg from chaincode state
        if (!msgAsBytes || msgAsBytes.length === 0) {
            throw new Error(`${msgID} does not exist`);
        }
        const msg = JSON.parse(msgAsBytes.toString());

        /* flag only if:
			1. flagger is not trying to flag its own msg
			2. flagger has not already flagged the msg
			3. flagger is not trying to flag $HELLO$ msgs
			4. flagger is not trying to flag a msg with flag = -1
        */
        if ((flagger !== msg.userID) && !(msg.flaggers.includes(flagger)) && (msg.msgText !== "$HELLO$") && (msg.flag !== -1)) {

            // push new flagger in flaggers array
            msg.flaggers.push(flagger);
            // increment flag
            msg.flag += 1;

            console.log(`msgID ${msgID} flagged successfully!`);

            // if flag count reaches threshold, set flag = -1
            if (msg.flag >= threshold) {
                msg.flag = -1;
                console.log(`msgID ${msgID} flag count has now reached threshold!`);
            }

        } else {
            throw new Error(`Cannot flag message!`);
        }

        await ctx.stub.putState(msgID, Buffer.from(JSON.stringify(msg)));
        console.info('============= END : flagMsg ===========');
    }

}

module.exports = FabChat;
