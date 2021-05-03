from flask import Flask, render_template, request,redirect, url_for
app = Flask(__name__)

chainstate = {
    '1': {
    'product_name': 'Tea Leaves',
    'certification': 'A4891742',
    'lifecycle': [
        'Tea Leaf Processing Factory',
        'Shakti Tea Vendors',
        'Mohan Prakash (Tea Estate)'
    ],
    'sub_products': []
    },
    '3': {
    'product_name': "Cow's Milk",
    'certification': 'B899132',
    'lifecycle': [
        'Hot & Fresh Milk Tea',
        'Nandi Milk Vendors',
        'Chirag Kariappa (Dairy Farm)'
    ],
    'sub_products': []
    },
    '5': {
    'product_name': 'Pepper Seeds',
    'lifecycle': [
        'Tea Leaf Processing Factory',
        'Om Spices Vendors',
        'Lakshmi Murthy (Pepper Estate)'
    ],
    'sub_products': []
    },
    '11': {
    'product_name': 'Processed Tea Leaves',
    'lifecycle': [ 'Hot & Fresh Milk Tea', 'Tea Leaf Processing Factory' ],
    'sub_products': [ [ '1', '9' ], [ '5', '10' ] ]
    },
    '16': {
    'product_name': 'Fresh Milk Tea',
    'lifecycle': [],
    'sub_products': [ [ '3', '14' ], [ '11', '15' ] ]
    }
}

def queryHistory(id):
    return chainstate

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/view/<id>')
def view(id):
    if id not in chainstate:
        return redirect(url_for('home'))
    return render_template('view.html', data=queryHistory(id), id=id)



if __name__ == "__main__":
    app.run()