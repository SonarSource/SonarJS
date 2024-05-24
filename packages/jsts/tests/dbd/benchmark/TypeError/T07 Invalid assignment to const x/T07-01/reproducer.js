
const session = {}
const order = {}

////

const sessionPayPalData = JSON.parse(session?.Item?.payPal?.S ?? '{}')

if ((sessionPayPalData?.orders ?? []).length > 0) {
  sessionPayPalData.orders.push({
    id: order.id,
    createdAt: new Date().getTime().toString()
  });
} else {
  sessionPayPalData = { // Noncompliant: sessionPayPalData is const
    orders: [{
      id: order.id,
      createdAt: new Date().getTime().toString()
    }],
  };
}
