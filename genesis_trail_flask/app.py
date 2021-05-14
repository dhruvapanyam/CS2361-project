import subprocess
import json
import random

from flask import Flask, render_template, request,redirect, url_for
app = Flask(__name__)


PATH_DIR = '/home/dhruva/fabric-samples/genesistrail/javascript/'
COMMAND = 'node'

USERNAME = 'customer'
USER_ID = -1
USER_TYPE = 'customer'
alerts = []

@app.context_processor
def inject_stage_and_region():
    global USERNAME
    global USER_ID
    global USER_TYPE
    global alerts
    # print('injecting!')
    temp_alerts = [al for al in alerts]
    alerts = []

    return dict(username=USERNAME, userID=USER_ID, user_type=USER_TYPE, alerts=temp_alerts)



def checkValidOutput(args):
    # args = ['query.js','tea_farmer',...]
    args = [COMMAND] + [PATH_DIR+args[0]] + args[1:]
    out = None
    valid = False
    try:
        out = subprocess.check_output(args).decode()
        out = out.split('GENESIS TRAIL OUTPUT:')
        print('------------------------------------------------')
        print('Valid?',len(out)>1)
        print('------------------------------------------------')
        print('Chaincode output:')
        print(out)
        print('------------------------------------------------')
        valid = len(out) > 1
    except:
        valid = False
    
    return out, valid

# def expectOutput(args, expected):
#     out, valid = checkValidOutput(args)
#     if not valid: return False

#     return out[1] == expected

def getPending():
    global USERNAME
    out,valid = checkValidOutput(['query.js',USERNAME,'0','pending'])
    if not valid:
        raise 'Invalid!'
    print('getPending ----------',out)
    out = json.loads(out[1])

    return out


def getHistory():
    global USERNAME
    out,valid = checkValidOutput(['query.js',USERNAME,'0','txnHistory'])
    if not valid:
        raise 'Invalid!'

    out = json.loads(out[1])

    return out

def getStorage():
    global USERNAME
    out,valid = checkValidOutput(['query.js',USERNAME,'0','storage'])
    if not valid:
        raise 'Invalid!'

    out = json.loads(out[1])

    return out

@app.route('/')
def landing():
    return render_template('landingpage.html')

@app.route('/home')
def home():
    global USERNAME
    global USER_TYPE
    global alerts

    if USER_TYPE == 'customer':
        return redirect(url_for('landing'))

    pend = []
    hist = []
    stor = {}
    if USER_TYPE != 'customer':
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
            alerts.append('An error occurred while fetching your data!')
            
    return render_template('home.html', txn_pending=pend, txn_history=hist, storage=stor)



@app.route('/login', methods=["POST","GET"])
def login():
    global USERNAME
    global USER_ID
    global USER_TYPE
    global alerts
    if request.method == "GET":
        return render_template('login.html')
    else:
        out = None
        uid = None
        print(request.form)
        usr = request.form['username']
        pwd = request.form['password']
        try:
            out,valid = checkValidOutput(['query.js',usr,pwd,'login'])
            if not valid:
                raise 'Invalid CLI output!'
            print('-----------')
            print(out)
            print('-----------')
            # print(out.split())
            out = out[1].strip()

        except:
            print('Invalid command / output !')
            alerts.append('An error occurred while trying to login!')
    
        print('output from login:',out)

        if out is None or out == "\nPERMISSION DENIED!\n":
            alerts.append('Invalid username or password!')
            return render_template('login.html')
        else:
            USERNAME = usr
            out = json.loads(out)
            print(out)
            USER_ID = out['userID']
            USER_TYPE = out['user_type']
            print('USER ID:',USER_ID)
            return redirect(url_for('home'))


@app.route('/logout')
def logout():
    global USERNAME
    global USER_TYPE
    USERNAME = 'customer'
    USER_ID = -1
    USER_TYPE = 'customer'
    return redirect(url_for('login'))


@app.route('/register', methods=["POST","GET"])
def register():
    global USERNAME
    global USER_TYPE
    global alerts
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
            args = ['registerUser.js',username,role,name,location,certificate, password]
        else:
            args = ['registerUser.js',username,role,name,location,password]

        out, valid = checkValidOutput(args)
        if not valid:
            alerts.append('Registration failed!')
            return render_template('register.html')

        return redirect(url_for('login'))


@app.route('/addtxn', methods=["POST","GET"])
def addtxn():
    global USERNAME
    global USER_TYPE
    global alerts
    username = USERNAME
    if request.method == "GET":
        hist = []
        stor = {}
        try:
            hist = getHistory()
            stor = getStorage()
        except:
            alerts.append('An error occurred while fetching your data!')
            return redirect(url_for('home'))

        return render_template('addtxn.html',txn_history=hist, storage=stor)
    else:
        data = request.form
        data = data.to_dict(flat=False)
        print('form output:', data)
        # return

        choice = ''.join(data['formname'])

        if(choice=='raw'):
            rawName = ''.join(data['raw_product'])
            rawQuant = data['raw_product_quantity'][0]
            rawUnit = data['raw_product_unit'][0]
            if (int(rawQuant) <= 0 or rawUnit == ''):
                return render_template('addtxn.html', alerts=['Something went wrong!'])

            print(rawName)
            _,valid = checkValidOutput(['invoke.js','createRaw',str(username),rawName, rawQuant, rawUnit])
            if not valid:
                alerts.append('An error occurred while creating transaction!')
                return redirect(url_for('home'))
                

        elif(choice=='purchase'):
            buyerID = ''.join(data["buyerID"])
            productID = ''.join(data["productID"])
            purchaseID = ''.join(data["purchaseID"])
            purQuant = data['purchase_quantity'][0]
            if int(purQuant) <= 0:
                return render_template('addtxn.html', alerts=['Something went wrong!'])

            _,valid = checkValidOutput(['invoke.js','createPurchase',str(username),buyerID, productID, purchaseID, purQuant])
            if not valid:
                alerts.append('An error occurred while creating transaction!')
                return redirect(url_for('home'))
                

        elif(choice=='production'):
            productName = ''.join(data['product_name'])
            # productID = data['ProductID']
            subproducts = data['production-sub_products'][0]
            if len(subproducts) == 0:
                return render_template('addtxn.html', alerts=['Invalid subproduct entry!'])
            else:
                subproducts = subproducts[:-1] # remove last space

            quantity = data['production-quantity'][0]
            unit = data['production-unit'][0]
            
            _,valid = checkValidOutput(['invoke.js','createProduction',str(username),productName,subproducts,quantity,unit])
            if not valid:
                alerts.append('An error occurred while creating transaction!')
                return redirect(url_for('home'))

        # USERNAME = usr
        return redirect(url_for('home'))


@app.route('/explore/<id>')
def explore(id):
    global USERNAME
    global USER_TYPE
    global alerts
    out = None
    try:
        out,valid = checkValidOutput(['query.js',USERNAME,str(id),'history'])
        if not valid:
            raise 'Invalid query!'
        out = json.loads(out[1])

    except:
        alerts.append('An error occurred while trying to retrieve product data')
        return redirect(url_for('home'))

    if len([k for k in out]) == 0:
        alerts.append('No history found for this ID!')
        return redirect(url_for('home'))

    id = max([int(k) for k in out])
    return render_template('explore.html', data=out, id=id)


@app.route('/user/<id>')
def view_user(id):
    global USERNAME
    global USER_TYPE
    out = None
    try:
        out,valid = checkValidOutput(['query.js',USERNAME,str(id),'viewUser'])
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
    global alerts
    try:
        out = subprocess.check_output([
            'invoke.js','validatePurchase',USERNAME,str(id)
            # 'echo','hi there'
        ])#.decode().split('OUTPUT:')[1]
        out = json.loads(out)
        
    except:
        # return redirect(url_for('home'))
        alerts.append('Could not validate this transaction!')
        pass

    print(out)
    return redirect(url_for('home'))

if __name__ == "__main__":
    app.run()