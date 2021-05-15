/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

// msgID of last msg that was posted
let txnID = -1;
// list of users
let users = [];

class GenesisTrail extends Contract {

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
        let storage = {};
        const txn = {
            type,
            data,
            txn_history,
            txn_pending,
            storage
        }

        
        console.log('user data:',data);
        txnID += 1;


        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('REGISTERED USER AT KEY:',txnID)
        console.info('============= END : registerUser ===========')

        return JSON.stringify(txnID)
    }

    async createRawTransaction(ctx, product_name, quantity, unit_type) {
        console.info('============= START : createRaw ===========')
        
        quantity = parseFloat(quantity);
        
        console.log(product_name, quantity,unit_type)
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
            certification,
            unit_type,
            quantity
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

        // Add this product to the farmer's storage
        user_entry.storage[txnID] = [quantity,unit_type];

        console.log('User\'s storage:',user_entry.storage)
        console.log('supposed to be:',[quantity,unit_type])

        await ctx.stub.putState(userID.toString(), Buffer.from(JSON.stringify(user_entry)));
        console.log("UPDATED USER #",userID,"'S HISTORY")



        console.info('============= END : createRaw ===========');
    }

    async createPurchaseTransaction(ctx, buyerID, productID, purchaseID, quantity) {
        console.info('============= START : createPurchase ===========');
        
        quantity = parseFloat(quantity);
        let cid = new ClientIdentity(ctx.stub);
        let userType,sellerID;
        userType = cid.getAttributeValue('user_type').toString()
        sellerID = cid.getAttributeValue('userID').toString()
        console.log('User Type:',userType)
        console.log('Seller:',sellerID)
        console.log('Buyer:',buyerID)
        console.log('Quantity:',quantity)

        if (userType == 'user') {
            console.log('Expected farmer or vendor or manufacturer role')
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
        else {
            let entry = await this.getState(ctx,purchaseID);
            if (entry.type != 'purchase'){
                throw 'This is not a valid purchaseID!'
            }
            if (entry.validated == false){
                throw 'The previous purchase has not been validated!'
            }

            
        }
        const txn = {
            type,
            metadata,
            productID,
            purchaseID,
            validated,
            quantity
        }

        console.log(`txn type : ${type}`);
        console.log(`buyer : ${metadata.buyer}`);
        console.log(`seller  : ${metadata.seller}`);
        console.log(`productID : ${productID}`);
        console.log(`purchaseID : ${purchaseID}`);

        txnID += 1;

        


        /*

        Here, we need to update seller and buyer

        Seller: Append to txn history
        Buyer: Append to pending txns (once they validate, it'll go to their txn history)

        */

        let seller_entry = await this.getState(ctx, sellerID);

        if (seller_entry.storage[productID][0] < quantity){
            throw 'Insufficient material in storage!'
        }

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

        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('CREATED PURCHASE AT KEY:',txnID)

        console.info('============= END : createPurchase ===========');
    }

    async createProductionTransaction(ctx, product_name, sub_products_json, quantity, unit_type) {
        console.info('============= START : createProduction ===========');

        let cid = new ClientIdentity(ctx.stub);

        quantity = parseFloat(quantity)
        
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

        for(let subp of sub_products){
            let entry = await this.getState(ctx, subp[1])
            if (entry.type != 'purchase'){
                throw 'Invalid sub_product!'
            }
            if (entry.validated == false){
                throw 'Sub product has not been validated!'
            }
        }

        let manuf_entry = await this.getState(ctx, userID);
        
        for(let subp of sub_products){
            let q = subp[2];    // subp = [prodID,purID,quan]
            let prodID = subp[0];
            manuf_entry.storage[prodID][0] -= q;

            if(manuf_entry.storage[prodID][0] < 0){
                throw 'Insufficient material in storage!'
            }
        }

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
            unit_type,
            quantity
        }

        console.log(`txn type : ${type}`);
        // console.log(`manufacturer : ${metadata.manufacturer}`);
        console.log(`sub_products : ${sub_products}`);

        txnID += 1;

        await ctx.stub.putState(txnID.toString(), Buffer.from(JSON.stringify(txn)));
        console.log('CREATED PRODUCTION AT KEY:',txnID)

        manuf_entry.txn_history.push({
            type: 'production',
            txnID: txnID
        })

        manuf_entry.storage[txnID] = [quantity,unit_type]

        await ctx.stub.putState(userID.toString(), Buffer.from(JSON.stringify(manuf_entry)));
        console.log("UPDATED USER #",userID,"'S HISTORY")

        console.info('============= END : createProduction ===========');
    }

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
            quantity: product.quantity,
            unit_type: product.unit_type,
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
                location: manuf.data.location,
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
                    location: u.data.location,
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

    async queryMaster(ctx, entryID) {
        console.info('============= START : queryProductByID ===========');
        console.log(`querying entryID: ${entryID}`);

        let productID;

        let txn = await this.getState(ctx, entryID);

        let lifecycle = []

        if (txn.type == 'purchase') {
            productID = txn.productID;

            let cur = txn.purchaseID;
            let u_entry = await this.getState(ctx, txn.metadata.buyer);

            lifecycle.push({
                name: u_entry.data.full_name,
                location: u_entry.data.location,
                userID: txn.metadata.buyer
            })

            let cur_pur = txn; // current purchase ID

            while (cur != null) {
                cur_pur = await this.getState(ctx, cur); // current purchase ID
                u_entry = await this.getState(ctx, cur_pur.metadata.buyer);
                lifecycle.push({
                    name: u_entry.data.full_name,
                    location: u_entry.data.location,
                    userID: cur_pur.metadata.seller
                })
                cur = cur_pur.purchaseID;
            }

            u_entry = await this.getState(ctx, cur_pur.metadata.seller);
            lifecycle.push({
                name: u_entry.data.full_name,
                location: u_entry.data.location,
                userID: cur_pur.metadata.seller
            })


        }
        else if (txn.type == 'user') {
            throw 'Cannot expand a user!'
        }
        else {
            productID = entryID;
        }


        let dict = {}
        await this.expandProduct(ctx,productID,null,null,dict)

        if (lifecycle.length) {
            dict[productID].lifecycle = lifecycle
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
        // return JSON.stringify(user_entry.txn_pending);
        let results = []
        for(let txn of user_entry.txn_pending){
            let pend_pur = await this.getState(ctx, String(txn.txnID)) // purchaseID
            if(pend_pur.type != 'purchase'){
                throw 'Something went wrong! (getPendingValidiations)'
            }
            let prod = await this.getState(ctx, pend_pur.productID);
            let unit_type = prod.unit_type;
            let seller_name = await this.getState(ctx, pend_pur.metadata.seller);
            seller_name = seller_name.data.full_name;
            results.push({
                seller: pend_pur.metadata.seller,
                seller_name:seller_name,
                productID: pend_pur.productID,
                txnID: txn.txnID,
                purchaseID: txn.txnID,
                product_name: pend_pur.metadata.product_name,
                quantity: pend_pur.quantity,
                unit_type: unit_type
            })
        }
        console.info('============ END : getPending ============')
        return JSON.stringify(results)
    }

    async getStorage(ctx) {

        console.info('============= START : getStorage ===========');
        let cid = new ClientIdentity(ctx.stub);

        // console.info('TXN ID:',txnID);
        
        let userID;
        // userType = cid.getAttributeValue('user_type').toString()
        userID = cid.getAttributeValue('userID').toString()
        let result = {};
        let user_entry = await this.getState(ctx, userID);
        for(let item in user_entry.storage){
            let pname = await this.getProductName(ctx, item)
            result[item] = {
                product_name: pname,
                quantity: user_entry.storage[item]
            }
        }

        return JSON.stringify(result)
    }

    async getTxnHistory(ctx) {
        // txnID = number of entries
        console.info('============= START : getHistory ===========');
        let cid = new ClientIdentity(ctx.stub);

        console.info('TXN ID:',txnID);
        
        let userType, userID;
        userType = cid.getAttributeValue('user_type').toString()
        userID = cid.getAttributeValue('userID').toString()

        let user_entry = await this.getState(ctx, userID);

        // return JSON.stringify(user_entry.txn_history);
        let results = []
        for(let txn of user_entry.txn_history){
            let hist = await this.getState(ctx, String(txn.txnID)) 
            console.log(txn.txnID)
            if(txn.type == 'bought'){
                let prod = await this.getState(ctx, hist.productID)
                let unit_type = prod.unit_type;
                let seller_entry = await this.getState(ctx, hist.metadata.seller);
                let seller_name = seller_entry.data.full_name;
                results.push({
                    type: txn.type,
                    seller: hist.metadata.seller,
                    seller_name: seller_name,
                    purchaseID: txn.txnID,
                    txnID: txn.txnID,
                    productID: hist.productID,
                    product_name: hist.metadata.product_name,
                    quantity: hist.quantity,
                    unit_type: unit_type
                })
            }
            else if(txn.type == 'sold'){
                let prod = await this.getState(ctx, hist.productID)
                let unit_type = prod.unit_type;
                let buyer_entry = await this.getState(ctx, hist.metadata.buyer);
                let buyer_name = buyer_entry.data.full_name;
                
                results.push({
                    type: txn.type,
                    buyer: hist.metadata.buyer,
                    buyer_name: buyer_name,
                    purchaseID: txn.txnID,
                    txnID: txn.txnID,
                    productID: hist.productID,
                    product_name: hist.metadata.product_name,
                    quantity: hist.quantity,
                    unit_type: unit_type,
                    validated: hist.validated
                })
            }
            else if(txn.type == 'raw')
                results.push({
                    type: txn.type,
                    txnID: txn.txnID,
                    productID: txn.txnID,
                    product_name: hist.metadata.product_name,
                    quantity: hist.quantity,
                    unit_type: hist.unit_type
                })
            else if(txn.type == 'production'){

                let subp = []
                for(let sub of hist.sub_products){
                    let pname = await this.getProductName(ctx, sub[0]);
                    let unit = await this.getState(ctx, sub[0]);
                    unit = unit.unit_type
                    subp.push({
                        productID: sub[0],
                        product_name: pname,
                        purchaseID: sub[1],
                        quantity: sub[2],
                        unit_type: unit
                    })
                }

                results.push({
                    type: txn.type,
                    txnID: txn.txnID,
                    productID: txn.txnID,
                    product_name: hist.metadata.product_name,
                    sub_products: subp,
                    quantity: hist.quantity,
                    unit_type: hist.unit_type
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
    }

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

        if (purchase_entry.metadata.buyer != userID) {
            throw 'You cannot validate this purchase!'
        }



        // ------------ check if seller has enough to sell

        let seller_entry = await this.getState(ctx, purchase_entry.metadata.seller);

        if (seller_entry.storage[purchase_entry.productID][0] < parseFloat(purchase_entry.quantity)){
            throw 'Seller does not have the specified amount!'
        }

        // else

        seller_entry.storage[purchase_entry.productID][0] -= parseFloat(purchase_entry.quantity);

        await ctx.stub.putState(purchase_entry.metadata.seller.toString(), Buffer.from(JSON.stringify(seller_entry)));





        purchase_entry.validated = true;
        await ctx.stub.putState(purID.toString(), Buffer.from(JSON.stringify(purchase_entry)));

        let user_entry = await this.getState(ctx, userID); //buyer

        let txn;
        for(let i=0; i < user_entry.txn_pending.length; i++){
            if (user_entry.txn_pending[i].txnID == purID){
                txn = user_entry.txn_pending[i];
                user_entry.txn_pending = user_entry.txn_pending.filter((x,j) => j!=i)
                break
            }
        }

        user_entry.txn_history.push(txn);

        let prodID = purchase_entry.productID;
        let quan = parseFloat(purchase_entry.quantity);
        let unit = seller_entry.storage[prodID][1];

        if(user_entry.storage[prodID] != undefined){
            user_entry.storage[prodID][0] += quan;
        }
        else{
            user_entry.storage[prodID] = [quan,unit];
        }

        await ctx.stub.putState(userID.toString(), Buffer.from(JSON.stringify(user_entry)));
        console.log("UPDATED USER #",userID,"'S HISTORY")

        console.info('============= START : validate ===========');

    }

}

module.exports = GenesisTrail;
