import subprocess
import json
import random

from flask import Flask, render_template, request,redirect, url_for
app = Flask(__name__)

USERNAME = 'customer'
customer = True

@app.context_processor
def inject_stage_and_region():
    global USERNAME
    global customer
    return dict(username=USERNAME,customer=customer)

def checkValidOutput(args):
    out = subprocess.check_output(args).decode()
    out = out.split('GENESIS TRAIL OUTPUT:')
    print('------------------------------------------------')
    print('Valid?',len(out)>1)
    print('------------------------------------------------')
    return out, (len(out) > 1)

# def expectOutput(args, expected):
#     out, valid = checkValidOutput(args)
#     if not valid: return False

#     return out[1] == expected

def getPending():
    global USERNAME
    out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,'0','pending'])
    if not valid:
        raise 'Invalid!'
    print('getPending ----------',out)
    out = json.loads(out[1])

    return out


def getHistory():
    global USERNAME
    out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,'0','txnHistory'])
    if not valid:
        raise 'Invalid!'

    out = json.loads(out[1])

    return out

def getStorage():
    global USERNAME
    out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,'0','storage'])
    if not valid:
        raise 'Invalid!'

    out = json.loads(out[1])

    return out


@app.route('/')
def home():
    global USERNAME
    global customer
    pend = []
    hist = []
    stor = {}
    if not customer:
        try:
            print('TRYING TO GET DATA')
            pend = getPending()
            print('got pending')
            hist = getHistory()
            print('got history')
            stor = getStorage()

            print('RECEIVED:')
            print('---------------')
            print('Pending:',pend)
            print('History:',hist)
            print('Storage:',stor)
        except:
            print('Invalid command / output !')
            
    return render_template('home.html', txn_pending=pend, txn_history=hist, storage=stor)



@app.route('/login', methods=["POST","GET"])
def login():
    global USERNAME
    global customer
    if request.method == "GET":
        return render_template('login.html', alerts=[])
    else:
        out = None
        print(request.form)
        usr = request.form['username']
        pwd = request.form['password']
        try:
            out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',usr,pwd,'login'])
            if not valid:
                raise 'Invalid CLI output!'
            print('-----------')
            print(out)
            print('-----------')
            # print(out.split())
            out = out[1]

        except:
            print('Invalid command / output !')
    
        print('output from login:',out)

        if out is None or out != "\nPERMISSION GRANTED!\n":
            return render_template('login.html', alerts=["Login failed!"])
        else:
            USERNAME = usr
            customer = False
            return redirect(url_for('home'))


@app.route('/logout')
def logout():
    global USERNAME
    global customer
    USERNAME = 'customer'
    customer = True
    return redirect(url_for('home'))


@app.route('/register', methods=["POST","GET"])
def register():
    global USERNAME
    global customer
    if request.method == "GET":
        return render_template('register.html')
    else:
        data = request.form
        name = data['name']
        username = data['username']
        password = data['password']
        location = data['location']
        certificate = data['certificate']
        role = data['role']

        args = []

        if(role=='farmer'):
            args = ['node','/home/dhruva/fabric-samples/fabchat/javascript/registerUser.js',username,role,name,location,certificate, password]
        else:
            args = ['node','/home/dhruva/fabric-samples/fabchat/javascript/registerUser.js',username,role,name,location,password]

        out, valid = checkValidOutput(args)
        if not valid:
            return render_template('register.html', alerts=['Could not register!'])

        return redirect(url_for('login'))


@app.route('/addtxn', methods=["POST","GET"])
def addtxn():
    global USERNAME
    global customer
    username = USERNAME
    if request.method == "GET":
        hist = []
        stor = {}
        try:
            hist = getHistory()
            stor = getStorage()
        except:
            return redirect(url_for('home'))
        return render_template('addtxn.html',txn_history=hist, storage=stor)
    else:
        data = request.form
        data = data.to_dict(flat=False)
        print('form output:', data)

        choice = ''.join(data['formname'])

        if(choice=='raw'):
            rawName = ''.join(data['raw_product'])
            rawQuant = data['raw_product_quantity'][0]
            rawUnit = data['raw_product_unit'][0]
            if (int(rawQuant) <= 0 or rawUnit == ''):
                return render_template('addtxn.html', alerts=['Something went wrong!'])

            print(rawName)
            _,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','createRaw',str(username),rawName, rawQuant, rawUnit])
            if not valid:
                return render_template('addtxn.html', alerts=['Something went wrong!'])

        elif(choice=='purchase'):
            buyerID = ''.join(data["buyerID"])
            productID = ''.join(data["productID"])
            purchaseID = ''.join(data["purchaseID"])
            purQuant = data['purchase_quantity'][0]
            if int(purQuant) <= 0:
                return render_template('addtxn.html', alerts=['Something went wrong!'])

            _,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','createPurchase',str(username),buyerID, productID, purchaseID, purQuant])
            if not valid:
                return render_template('addtxn.html', alerts=['Something went wrong!'])

        elif(choice=='production'):
            productName = ''.join(data['product_name'])
            productID = data['ProductID']
            purchaseID = data['PurchaseID']
            subproducts = []
            s = ""
            for i in range(len(productID)):
                s = str(productID[i])
                subproducts.append(s)
                s = str(purchaseID[i])
                subproducts.append(s)
            
            sub = (' ').join(subproducts)
            print(sub)
            # for ele in subproducts:
            #     sub = sub + " " + '"' + ele + '"'

            _,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','createProduction',str(username),productName,sub])
            if not valid:
                return render_template('addtxn.html', alerts=['Something went wrong!'])

        # USERNAME = usr
        return redirect(url_for('home'))


@app.route('/explore/<id>')
def explore(id):
    global USERNAME
    global customer
    out = None
    try:
        out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,str(id),'history'])
        if not valid:
            raise 'Invalid query!'
        out = json.loads(out[1])

    except:
        return redirect(url_for('home'))

    if id not in out:
        return redirect(url_for('home'))
    return render_template('explore.html', data=out, id=id)


@app.route('/user/<id>')
def view_user(id):
    global USERNAME
    global customer
    out = None
    try:
        out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,str(id),'viewUser'])
        if not valid:
            raise 'Invalid query!'
        out = json.loads(out[1])        
    except:
        return redirect(url_for('home'))
        # pass

    
    return render_template('view_user.html', data=out, id=id)


@app.route('/validate/<id>', methods=['POST'])
def validate(id):
    print("VALIDATE")
    out = None
    global USERNAME
    try:
        out = subprocess.check_output([
            'node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','validatePurchase',USERNAME,str(id)
            # 'echo','hi there'
        ])#.decode().split('OUTPUT:')[1]
        out = json.loads(out)
        
    except:
        # return redirect(url_for('home'))
        pass

    print(out)
    return redirect(url_for('home'))

if __name__ == "__main__":
    app.run()