import subprocess
import json

from flask import Flask, render_template, request,redirect, url_for
app = Flask(__name__)

USERNAME = 'customer'
customer = True


def checkValidOutput(args):
    out = subprocess.check_output(args).decode()
    out = out.split('GENESIS TRAIL OUTPUT:')
    return out, (len(out) > 1)

# def expectOutput(args, expected):
#     out, valid = checkValidOutput(args)
#     if not valid: return False

#     return out[1] == expected


@app.route('/')
def home():
    global USERNAME
    global customer
    out = None
    if customer:
        try:
            out,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,'0','pending'])
            if not valid:
                out = None
                raise 'Invalid CLI output!'
        
            out = json.loads(out[1])

        except:
            print('Invalid command / output !')
        
        print('PENDING:')
        print(out)
            
    return render_template('home.html', pending=out, customer=customer, username=USERNAME)



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
    username = USERNAME
    if request.method == "GET":
        return render_template('addtxn.html', username=username)
    else:
        data = request.form
        data = data.to_dict(flat=False)
        print('form output:', data)

        choice = ''.join(data['formname'])

        if(choice=='raw'):
            rawName = ''.join(data['raw_product'])
            print(rawName)
            _,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','createRaw',str(username),rawName])
            if not valid:
                return render_template('addtxn.html', alerts=['Something went wrong!'])

        elif(choice=='purchase'):
            buyerID = ''.join(data["buyerID"])
            productID = ''.join(data["productID"])
            purchaseID = ''.join(data["purchaseID"])
            _,valid = checkValidOutput(['node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','createPurchase',str(username),buyerID, productID, purchaseID])
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
    try:
        out = subprocess.check_output([
            'node','/home/dhruva/fabric-samples/fabchat/javascript/invoke.js','validatePurchase','tea_farmer',str(id)
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