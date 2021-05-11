/*
 * SPDX-License-Identifier: Apache-2.0
 */


 /*
CUSTOMER CLIENT:
    node registerUser.js <username> customer

FARMER:
    node registerUser.js <username> farmer <full name> <location> <organic certificate number> <pwd>

VENDOR:
    node registerUser.js <username> vendor <full name> <location> <pwd>

MANFUFACTURER:
    node registerUser.js <username> manufacturer <full name> <location> <pwd>


 */

'use strict';

const {FileSystemWallet, Gateway, X509WalletMixin} = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
let user, uName, uRole, fCert, uLoc, pwd;

process.argv.forEach(function (val, index, array) {
    user = array[2];
    uRole = array[3];
    
    switch(uRole){
        case 'customer':
            break

        case 'farmer':
            uName = array[4];
            uLoc = array[5];
            fCert = array[6];
            if (fCert == 'null') fCert = null
            pwd = array[7];
            break

        case 'vendor':
            uName = array[4];
            uLoc = array[5]
            pwd = array[6];
            break;

        case 'manufacturer':
            uName = array[4];
            uLoc = array[5]
            pwd = array[6];
            break;

        default:
            throw 'Invalid user type! Typo detected.'
    }

});

async function createUserEntry(data) {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(path.resolve(__dirname), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('admin');
        if (!userExists) {
            console.log(`An identity for the user ${user} does not exist in the wallet`);
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: 'admin', discovery: {enabled: false}});

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabchat');

        const result = await contract.submitTransaction('registerUser',JSON.stringify(data));
        let temp_result = JSON.parse(result)

        await gateway.disconnect();
        return temp_result;

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

async function main() {
    try {
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(path.resolve(__dirname), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(user);
        if (userExists) {
            console.log(`An identity for the user ${user} already exists in the wallet`);
            return;
        }

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: 'admin', discovery: {enabled: false}});

        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();

        // Register the user, enroll the user, and import the new identity into the wallet.

        let attrs = [
            { name: 'user_type', value: uRole, ecert: true},
        ]

        let attr_reqs = [
            {name: "user_type", optional: false},
        ]

        if (uRole != 'customer'){
            attrs.push({ name: 'full_name', value: uName, ecert: true})
            attr_reqs.push({name: "full_name", optional: false})

            attrs.push({ name: 'location', value: uLoc, ecert: true})
            attr_reqs.push({name: "location", optional: false})

            attrs.push({ name: 'password', value: pwd, ecert: true})
            attr_reqs.push({name: "password", optional: false})
        }

        if (uRole == 'farmer'){
            attrs.push({ name: 'organic_certificate', value: fCert, ecert: true})
            attr_reqs.push({name: "organic_certificate", optional: false})
        }

        if(uRole != 'customer'){
            var uID = await createUserEntry({
                // username: user,
                user_type: uRole,
                full_name: uName,
                location: uLoc,
                certification: fCert
            })

            console.log('New user entry created! UID:',uID,typeof uID);

            attrs.push({name: 'userID', value: String(uID), ecert: true});
            attr_reqs.push({name: 'userID', optional: false});
        }


        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: user,
            role: 'client',
            attrs: attrs
        }, adminIdentity);
        const enrollment = await ca.enroll({
            enrollmentID: user, 
            enrollmentSecret: secret,
            attr_reqs: attr_reqs
        });
        const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
        wallet.import(user, userIdentity);
        console.log(`Successfully registered and enrolled admin user ${user} and imported it into the wallet`);


        console.log('GENESIS TRAIL OUTPUT:')
        console.log('Registration successful!')

        return;

    } catch (error) {
        console.error(`Failed to register user ${user}: ${error}`);
        process.exit(1);
    }
}

main();
