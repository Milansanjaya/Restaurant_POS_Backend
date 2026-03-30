# BACKEND API TESTING GUIDE

## 🚀 STARTING THE SERVER

```bash
cd F:\Restaurant_POS_Backend
npm run dev
```

Server should start on: `http://localhost:5000` (or port from .env)

---

## 🔑 AUTHENTICATION

All API endpoints require authentication except `/health` and `/api/auth/*`

### 1. Register/Login First
```bash
POST http://localhost:5000/api/auth/register-admin
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@pos.com",
  "password": "admin123",
  "branch_id": "BR001"
}
```

Response will include JWT token. Use this token in all subsequent requests.

### 2. Add Token to Headers
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## 📦 API TESTING CHECKLIST

### ✅ SUPPLIERS MODULE (8 endpoints)

#### Create Supplier
```bash
POST http://localhost:5000/api/suppliers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "ABC Supplies Ltd",
  "contactPerson": "John Doe",
  "email": "john@abc.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "gstNumber": "GST123456",
  "panNumber": "PAN123456",
  "creditLimit": 50000,
  "paymentTerms": 30
}
```

#### Get All Suppliers
```bash
GET http://localhost:5000/api/suppliers
Authorization: Bearer {token}
```

#### Get Supplier by ID
```bash
GET http://localhost:5000/api/suppliers/{supplier_id}
Authorization: Bearer {token}
```

#### Get Supplier Ledger
```bash
GET http://localhost:5000/api/suppliers/{supplier_id}/ledger
Authorization: Bearer {token}
```

#### Record Payment
```bash
POST http://localhost:5000/api/suppliers/{supplier_id}/payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": "BANK_TRANSFER",
  "reference": "TXN123456",
  "notes": "Payment for invoice #INV001"
}
```

---

### ✅ PURCHASE ORDERS MODULE (5 endpoints)

#### Create PO
```bash
POST http://localhost:5000/api/purchase-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "supplier_id": "{supplier_id}",
  "items": [
    {
      "product_id": "{product_id}",
      "productName": "Rice 25kg",
      "quantity": 100,
      "unitPrice": 25.50,
      "totalPrice": 2550
    }
  ],
  "totalAmount": 2550,
  "expectedDeliveryDate": "2026-04-15",
  "notes": "Urgent order"
}
```

#### Get All POs
```bash
GET http://localhost:5000/api/purchase-orders?status=PENDING
Authorization: Bearer {token}
```

#### Approve PO
```bash
POST http://localhost:5000/api/purchase-orders/{po_id}/approve
Authorization: Bearer {token}
```

---

### ✅ GRN MODULE (4 endpoints)

#### Create GRN
```bash
POST http://localhost:5000/api/grn
Authorization: Bearer {token}
Content-Type: application/json

{
  "purchaseOrder_id": "{po_id}",
  "supplier_id": "{supplier_id}",
  "items": [
    {
      "product_id": "{product_id}",
      "productName": "Rice 25kg",
      "orderedQuantity": 100,
      "receivedQuantity": 98,
      "batchNumber": "BATCH001",
      "expiryDate": "2027-12-31",
      "unitPrice": 25.50,
      "totalPrice": 2499
    }
  ],
  "totalAmount": 2499,
  "qualityStatus": "APPROVED",
  "notes": "2 bags damaged"
}
```

#### Approve GRN (Auto updates stock!)
```bash
POST http://localhost:5000/api/grn/{grn_id}/approve
Authorization: Bearer {token}
```

This will:
- ✅ Update inventory stock
- ✅ Create batch records
- ✅ Update supplier balance
- ✅ Change PO status to RECEIVED

---

### ✅ BATCHES MODULE (8 endpoints)

#### Get Expiry Dashboard
```bash
GET http://localhost:5000/api/batches/expiry-dashboard
Authorization: Bearer {token}
```

Returns:
- Total batches
- Expired count
- Critical (< 7 days)
- Warning (< 30 days)
- Normal

#### Get Near Expiry Batches
```bash
GET http://localhost:5000/api/batches/near-expiry?days=30
Authorization: Bearer {token}
```

#### Block Expired Batch
```bash
POST http://localhost:5000/api/batches/{batch_id}/block
Authorization: Bearer {token}
```

---

### ✅ CUSTOMERS MODULE (9 endpoints)

#### Create Customer
```bash
POST http://localhost:5000/api/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1987654321",
  "address": "456 Oak Ave",
  "tier": "REGULAR"
}
```

#### Get Walk-in Customer (Auto-created)
```bash
GET http://localhost:5000/api/customers/walk-in
Authorization: Bearer {token}
```

Returns default customer (CUST-000000) for anonymous sales

#### Get Customer by Phone
```bash
GET http://localhost:5000/api/customers/by-phone/+1987654321
Authorization: Bearer {token}
```

#### Get Purchase History
```bash
GET http://localhost:5000/api/customers/{customer_id}/history
Authorization: Bearer {token}
```

---

### ✅ LOYALTY MODULE (7 endpoints)

#### Earn Points (1 point per $10)
```bash
POST http://localhost:5000/api/loyalty/earn
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "{customer_id}",
  "saleAmount": 150.00,
  "sale_id": "{sale_id}"
}
```

Earns 15 points (150 / 10)

#### Redeem Points (100 points = $10)
```bash
POST http://localhost:5000/api/loyalty/redeem
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "{customer_id}",
  "points": 100,
  "sale_id": "{sale_id}"
}
```

Returns $10 discount

#### Wallet Topup
```bash
POST http://localhost:5000/api/loyalty/wallet/topup
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "{customer_id}",
  "amount": 50.00,
  "paymentMethod": "CASH",
  "reference": "TOP123"
}
```

#### Wallet Payment
```bash
POST http://localhost:5000/api/loyalty/wallet/payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": "{customer_id}",
  "amount": 25.00,
  "sale_id": "{sale_id}"
}
```

#### Get Customer Loyalty Account
```bash
GET http://localhost:5000/api/loyalty/{customer_id}
Authorization: Bearer {token}
```

Shows:
- Total points
- Wallet balance
- Lifetime value

---

### ✅ CATEGORIES MODULE (5 endpoints)

#### Create Category
```bash
POST http://localhost:5000/api/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Beverages",
  "description": "All drinks",
  "icon": "🍹",
  "displayOrder": 1
}
```

#### Create Subcategory
```bash
POST http://localhost:5000/api/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Soft Drinks",
  "parentId": "{parent_category_id}",
  "displayOrder": 1
}
```

#### Get Category Tree
```bash
GET http://localhost:5000/api/categories
Authorization: Bearer {token}
```

Returns hierarchical tree structure with children

---

### ✅ UNITS MODULE (5 endpoints)

#### Create Base Unit
```bash
POST http://localhost:5000/api/units
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Kilogram",
  "shortCode": "kg",
  "type": "WEIGHT"
}
```

#### Create Derived Unit (with conversion)
```bash
POST http://localhost:5000/api/units
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Gram",
  "shortCode": "g",
  "type": "WEIGHT",
  "baseUnit": "{kilogram_unit_id}",
  "conversionFactor": 0.001
}
```

1 gram = 0.001 kg

#### Get All Units
```bash
GET http://localhost:5000/api/units?type=WEIGHT
Authorization: Bearer {token}
```

Filter by: WEIGHT, VOLUME, COUNT, LENGTH

---

### ✅ CONFIG MODULE (4 endpoints)

#### Get Configuration
```bash
GET http://localhost:5000/api/config
Authorization: Bearer {token}
```

Returns current branch configuration or creates default

#### Update Tax Settings
```bash
PUT http://localhost:5000/api/config/tax
Authorization: Bearer {token}
Content-Type: application/json

{
  "taxes": [
    {
      "name": "GST",
      "rate": 18,
      "isDefault": true,
      "type": "EXCLUSIVE"
    },
    {
      "name": "Service Charge",
      "rate": 10,
      "isDefault": false,
      "type": "EXCLUSIVE"
    }
  ]
}
```

#### Update Full Config
```bash
PUT http://localhost:5000/api/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "currency": {
    "code": "USD",
    "symbol": "$",
    "position": "BEFORE"
  },
  "expiryAlertDays": 30,
  "invoiceFormat": {
    "prefix": "INV",
    "numberLength": 6,
    "footer": "Thank you for your business!"
  },
  "pointsPerDollar": 0.1,
  "pointsExpiryDays": 365
}
```

---

### ✅ RETURNS MODULE (4 endpoints)

#### Create Supplier Return
```bash
POST http://localhost:5000/api/returns
Authorization: Bearer {token}
Content-Type: application/json

{
  "supplier_id": "{supplier_id}",
  "grn_id": "{grn_id}",
  "items": [
    {
      "product_id": "{product_id}",
      "productName": "Rice 25kg",
      "batch_id": "{batch_id}",
      "quantity": 2,
      "reason": "Damaged goods",
      "unitPrice": 25.50,
      "totalPrice": 51
    }
  ],
  "totalAmount": 51,
  "notes": "Bags were torn"
}
```

#### Get All Returns
```bash
GET http://localhost:5000/api/returns?status=PENDING&supplier_id={supplier_id}
Authorization: Bearer {token}
```

#### Approve Return (Auto adjustments!)
```bash
POST http://localhost:5000/api/returns/{return_id}/approve
Authorization: Bearer {token}
```

This will:
- ✅ Deduct stock from inventory
- ✅ Reduce supplier outstanding balance
- ✅ Generate debit note

---

## 🧪 TESTING WORKFLOW

### Complete Procurement Cycle Test:

1. **Create Supplier**
   ```
   POST /api/suppliers
   ```

2. **Create Purchase Order**
   ```
   POST /api/purchase-orders
   ```

3. **Approve PO**
   ```
   POST /api/purchase-orders/{id}/approve
   ```

4. **Receive Goods (GRN)**
   ```
   POST /api/grn
   ```

5. **Approve GRN** ← Auto magic happens!
   ```
   POST /api/grn/{id}/approve
   ```

6. **Check Results:**
   - Inventory stock increased ✅
   - Batch created with expiry ✅
   - Supplier balance updated ✅
   - PO status = RECEIVED ✅

7. **Check Expiry Dashboard**
   ```
   GET /api/batches/expiry-dashboard
   ```

8. **Create Return (if needed)**
   ```
   POST /api/returns
   POST /api/returns/{id}/approve
   ```

### Complete Sales & Loyalty Test:

1. **Create Customer**
   ```
   POST /api/customers
   ```

2. **Make Sale** (using existing sales API)
   ```
   POST /api/sales
   ```

3. **Earn Points**
   ```
   POST /api/loyalty/earn
   ```

4. **Check Loyalty Account**
   ```
   GET /api/loyalty/{customer_id}
   ```

5. **Redeem Points**
   ```
   POST /api/loyalty/redeem
   ```

6. **Topup Wallet**
   ```
   POST /api/loyalty/wallet/topup
   ```

7. **Use Wallet for Payment**
   ```
   POST /api/loyalty/wallet/payment
   ```

---

## 🐛 TROUBLESHOOTING

### Common Issues:

1. **401 Unauthorized**
   - Missing or invalid JWT token
   - Token expired (login again)

2. **403 Forbidden**
   - User role doesn't have permission
   - Branch isolation violation

3. **404 Not Found**
   - Invalid route
   - Resource doesn't exist in branch

4. **500 Internal Server Error**
   - Check server console logs
   - MongoDB connection issues
   - Validation errors

### Server Not Starting?

```bash
# Check Node version (need 14+)
node --version

# Reinstall dependencies
npm install

# Check MongoDB connection
# Verify .env file has correct MONGODB_URI

# Check port conflicts
# Change PORT in .env if 5000 is busy
```

---

## 📊 EXPECTED RESULTS

### After Successful Tests:

✅ Suppliers can be created and managed
✅ Purchase orders flow through approval workflow
✅ GRN automatically updates stock, batches, balances
✅ Batch expiry alerts work correctly
✅ Customer tier upgrades automatically
✅ Loyalty points earn and redeem properly
✅ Wallet topup and payment works
✅ Categories show tree structure
✅ Units with conversions work
✅ Config saves and retrieves properly
✅ Returns adjust stock and supplier balance

---

## 🎯 NEXT STEPS AFTER TESTING

Once all APIs work:
1. ✅ Backend verified
2. 🚀 Start frontend development
3. 🎨 Build React UI
4. 📱 Integrate with Electron
5. 🔌 Connect frontend to backend APIs

---

## 📞 SUPPORT

For testing help:
- Use **Postman** or **Thunder Client** (VS Code extension)
- Check server console for error messages
- Verify JWT token is valid
- Ensure branch_id is included in requests

---

Generated: ${new Date().toDateString()}
Backend Status: 100% Complete ✅
