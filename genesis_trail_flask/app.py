import subprocess
import json

from flask import Flask, render_template, request,redirect, url_for
app = Flask(__name__)

USERNAME = 'dhruva'


@app.route('/')
def home():
    out = None
    customer = True
    try:
        out = subprocess.check_output([
            'node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,'0','pending'
        ]).decode().split('OUTPUT:')[1]
        out = json.loads(out)
        customer = False
        
    except:
        pass

    # print('PENDING:')
    # print('-------------------')
    # print(out)
    return render_template('home.html', pending=out, customer=customer)

# @app.route('/login', methods=["POST"])
# def login():
#     global USERNAME
#     if len(request.form['username']):
#         USERNAME = request.form['username']
#         print('username is now:',USERNAME)
#     return redirect(url_for('home'))

@app.route('/login', methods=["POST","GET"])
def login():
    global USERNAME
    if request.method == "GET":
        return render_template('login.html', alerts=[])
    else:
        out = None
        usr = request.form['username']
        pwd = request.form['password']
        try:
            out = subprocess.check_output([
                'node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',usr,pwd,'login'
            ]).decode().split('OUTPUT:')[1]
            out = json.loads(out)

        except:
            pass
    
        print('output from login:',out)

        if out is None or out != "PERMISSION GRANTED!":
            return render_template('login.html', alerts=["Login failed!"])
        else:
            USERNAME = usr
            return redirect(url_for('home'))

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/explore/<id>')
def explore(id):
    out = None
    try:
        out = subprocess.check_output([
            'node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,str(id),'history'
        ]).decode().split('OUTPUT:')[1]
        out = json.loads(out)
        
    except:
        return redirect(url_for('home'))

    if id not in out:
        return redirect(url_for('home'))
    return render_template('explore.html', data=out, id=id)

@app.route('/user/<id>')
def view_user(id):
    out = None
    try:
        out = subprocess.check_output([
            'node','/home/dhruva/fabric-samples/fabchat/javascript/query.js',USERNAME,str(id),'viewUser'
        ]).decode().split('OUTPUT:')[1]
        out = json.loads(out)
        
    except:
        # return redirect(url_for('home'))
        pass

    if id not in out:
        return redirect(url_for('home'))
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