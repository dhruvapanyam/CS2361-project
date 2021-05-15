#!/bin/sh

node enrollAdmin.js

node registerUser.js customer customer

node registerUser.js tea_estate farmer "Mohan Tea Estate" Ooty A9130298 password
node registerUser.js pepper_estate farmer "Girija Pepper Estate" Chikmaglur B1837281 password
node registerUser.js dairy_farm farmer "Chirag Dairy Farm" Bangalore null password

node registerUser.js tea_coffee_vendor vendor "Shanti Vendors: Raw Tea Leaves and Coffee Beans" Chennai password
node registerUser.js spice_vendor vendor "Gagan Spices" Hosur password
node registerUser.js milk_vendor vendor "Nandi Milk Vendors" Bangalore password
node registerUser.js departmental_store vendor "Ram Mohan Provisions Store" Bangalore password

node registerUser.js spice_tea manufacturer "Processed Tea Leaves Factory" Hosur password
node registerUser.js packet_tea_maker manufacturer "Flavoured Tea Packet Factory" Bangalore password

node invoke.js createRaw tea_estate "Fresh Tea Leaves" 50 kg
node invoke.js createRaw tea_estate "Ground Tea Leaves" 50 kg

node invoke.js createRaw pepper_estate "Fresh Pepper Seeds" 50 kg
node invoke.js createRaw pepper_estate "Ground Pepper" 20 kg

node invoke.js createRaw dairy_farm "Natural Cow's Milk" 50 L


node invoke.js createPurchase tea_estate 3 9 null 25
node invoke.js validatePurchase tea_coffee_vendor 14

node invoke.js createPurchase tea_estate 3 10 null 25
node invoke.js validatePurchase tea_coffee_vendor 15

node invoke.js createPurchase pepper_estate 4 11 null 25
node invoke.js validatePurchase spice_vendor 16

node invoke.js createPurchase pepper_estate 4 12 null 10
node invoke.js validatePurchase spice_vendor 17

node invoke.js createPurchase dairy_farm 8 13 null 20
node invoke.js validatePurchase packet_tea_maker 18


node invoke.js createPurchase tea_coffee_vendor 7 9 14 15
node invoke.js validatePurchase spice_tea 19

node invoke.js createPurchase tea_coffee_vendor 7 10 15 10
node invoke.js validatePurchase spice_tea 20

node invoke.js createPurchase spice_vendor 7 11 16 10
node invoke.js validatePurchase spice_tea 21


node invoke.js createProduction spice_tea "Spiced Tea Leaves" "9 19 12 10 20 8 11 21 10" 25 kg

node invoke.js createPurchase spice_tea 8 22 null 15
node invoke.js validatePurchase packet_tea_maker 23


node invoke.js createProduction packet_tea_maker "Iced Pepper Tea (Tetra pack)" "22 23 10 13 18 20" 70 "cartons(1L)"

node invoke.js createPurchase packet_tea_maker 6 24 null 30
node invoke.js validatePurchase departmental_store 25



