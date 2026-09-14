const fs = require('fs');
const path = require('path');

// Fix 1: missing name in upsert
const exchangeFile = path.join(__dirname, 'src/app/api/v1/auth/exchange/route.ts');
let exchangeCode = fs.readFileSync(exchangeFile, 'utf8');
exchangeCode = exchangeCode.replace(
  ".upsert({ id: sbUser.id, phone: e164Phone, role: 'USER' }",
  ".upsert({ id: sbUser.id, phone: e164Phone, name: 'User', role: 'USER' }"
);
fs.writeFileSync(exchangeFile, exchangeCode);

// Fix 2: param promise in cancel route
const cancelFile = path.join(__dirname, 'src/app/api/v1/user/bookings/[id]/cancel/route.ts');
let cancelCode = fs.readFileSync(cancelFile, 'utf8');
cancelCode = cancelCode.replace(
  "{ params }: { params: { id: string } }",
  "{ params }: { params: Promise<{ id: string }> }"
);
cancelCode = cancelCode.replace(
  "const bookingId = params.id;",
  "const bookingId = (await params).id;"
);
fs.writeFileSync(cancelFile, cancelCode);

// Fix 3: amount_paid parsing
const orderFile = path.join(__dirname, 'src/app/api/v1/user/payments/create-order/route.ts');
let orderCode = fs.readFileSync(orderFile, 'utf8');
orderCode = orderCode.replace(
  "parseFloat(booking.amount_paid)",
  "Number(booking.amount_paid || 0)"
);
fs.writeFileSync(orderFile, orderCode);
