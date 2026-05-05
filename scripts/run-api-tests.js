/* eslint-disable no-console */

// Minimal API test runner for local GraphQL endpoint.
// Usage: node scripts/run-api-tests.js

const URI = process.env.GRAPHQL_URL || "http://localhost:3000/graphql";

async function gql(token, query, variables) {
  const headers = {
    "content-type": "application/json",
    "apollo-require-preflight": "true",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(URI, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { __parseError: true, __raw: text };
  }
  return { status: res.status, json };
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function login(email) {
  return gql(
    null,
    "mutation($e:String!,$p:String!){login(input:{email:$e,password:$p}){accessToken user{id email role country}}}",
    { e: email, p: "Password123!" },
  );
}

async function main() {
  const results = [];
  const add = (name, expectText, pass, details) =>
    results.push({ name, expect: expectText, pass, details });

  // Step 1: tokens
  const admin = await login("nick.fury@shield.gov");
  const ADMIN_TOKEN = admin.json?.data?.login?.accessToken;
  add("Login ADMIN", "SUCCESS", !!ADMIN_TOKEN, admin.json?.data?.login?.user?.role);

  const im = await login("carol.danvers@shield.gov");
  const INDIA_MANAGER_TOKEN = im.json?.data?.login?.accessToken;
  add(
    "Login INDIA_MANAGER",
    "SUCCESS",
    !!INDIA_MANAGER_TOKEN,
    im.json?.data?.login?.user?.country,
  );

  const um = await login("steve.rogers@shield.gov");
  const USA_MANAGER_TOKEN = um.json?.data?.login?.accessToken;
  add(
    "Login USA_MANAGER",
    "SUCCESS",
    !!USA_MANAGER_TOKEN,
    um.json?.data?.login?.user?.country,
  );

  const ii = await login("thanos@titan.mcu");
  const INDIA_MEMBER_TOKEN = ii.json?.data?.login?.accessToken;
  const INDIA_MEMBER_ID = ii.json?.data?.login?.user?.id;
  add(
    "Login INDIA_MEMBER",
    "SUCCESS",
    !!INDIA_MEMBER_TOKEN,
    ii.json?.data?.login?.user?.country,
  );

  const ui = await login("travis@usa.test");
  const USA_MEMBER_TOKEN = ui.json?.data?.login?.accessToken;
  add(
    "Login USA_MEMBER",
    "SUCCESS",
    !!USA_MEMBER_TOKEN,
    ui.json?.data?.login?.user?.country,
  );

  // Step 2: restaurants ReBAC
  const qRest =
    "query{restaurants(pagination:{skip:0,take:20}){totalCount items{id country}}}";
  const rIndia = await gql(INDIA_MEMBER_TOKEN, qRest);
  const indiaCountries = [
    ...new Set((rIndia.json?.data?.restaurants?.items || []).map((x) => x.country)),
  ];
  add(
    "Restaurants INDIA_MEMBER",
    "ONLY INDIA",
    indiaCountries.length === 1 && indiaCountries[0] === "INDIA",
    `countries=${indiaCountries}`,
  );

  const rUsa = await gql(USA_MEMBER_TOKEN, qRest);
  const usaCountries = [
    ...new Set((rUsa.json?.data?.restaurants?.items || []).map((x) => x.country)),
  ];
  add(
    "Restaurants USA_MEMBER",
    "ONLY USA",
    usaCountries.length === 1 && usaCountries[0] === "USA",
    `countries=${usaCountries}`,
  );

  const rAdmin = await gql(ADMIN_TOKEN, qRest);
  const adminCountries = [
    ...new Set((rAdmin.json?.data?.restaurants?.items || []).map((x) => x.country)),
  ].sort();
  add(
    "Restaurants ADMIN",
    "INDIA+USA",
    adminCountries.includes("INDIA") && adminCountries.includes("USA"),
    `countries=${adminCountries}`,
  );

  // Step 3: menu access
  const INDIA_REST = "00000000-0000-4000-8000-000000000001";
  const USA_REST = "00000000-0000-4000-8000-000000000002";
  const qMenu = "query($id:ID!){menuItems(restaurantId:$id){id name}}";

  const mIndia = await gql(INDIA_MEMBER_TOKEN, qMenu, { id: INDIA_REST });
  const INDIA_MENU_ITEM_ID = mIndia.json?.data?.menuItems?.[0]?.id;
  add(
    "Menu INDIA as INDIA_MEMBER",
    "SUCCESS",
    !!INDIA_MENU_ITEM_ID,
    `items=${mIndia.json?.data?.menuItems?.length || 0}`,
  );

  const mIndiaUsa = await gql(USA_MEMBER_TOKEN, qMenu, { id: INDIA_REST });
  add(
    "Menu INDIA as USA_MEMBER",
    "403",
    !!mIndiaUsa.json?.errors?.[0]?.message &&
      /outside your country/i.test(mIndiaUsa.json.errors[0].message),
    mIndiaUsa.json?.errors?.[0]?.message,
  );

  const mUsaAdmin = await gql(ADMIN_TOKEN, qMenu, { id: USA_REST });
  const USA_MENU_ITEM_ID = mUsaAdmin.json?.data?.menuItems?.[0]?.id;
  add(
    "Menu USA as ADMIN",
    "SUCCESS",
    !!USA_MENU_ITEM_ID,
    `items=${mUsaAdmin.json?.data?.menuItems?.length || 0}`,
  );

  // Step 4: cart behavior (INDIA_MEMBER)
  const mAdd =
    "mutation($id:ID!,$q:Int!){addToCart(input:{menuItemId:$id,quantity:$q}){items{menuItemId quantity}}}";

  const add1 = await gql(INDIA_MEMBER_TOKEN, mAdd, { id: INDIA_MENU_ITEM_ID, q: 2 });
  const q1 = (add1.json?.data?.addToCart?.items || []).find(
    (x) => x.menuItemId === INDIA_MENU_ITEM_ID,
  )?.quantity;
  add("Cart add INDIA item", "qty=2", q1 === 2, `qty=${q1}`);

  const add2 = await gql(INDIA_MEMBER_TOKEN, mAdd, { id: INDIA_MENU_ITEM_ID, q: 1 });
  const q2 = (add2.json?.data?.addToCart?.items || []).find(
    (x) => x.menuItemId === INDIA_MENU_ITEM_ID,
  )?.quantity;
  add("Cart increment", "qty=3", q2 === 3, `qty=${q2}`);

  const addUsa = await gql(INDIA_MEMBER_TOKEN, mAdd, { id: USA_MENU_ITEM_ID, q: 1 });
  add(
    "Cart add USA item as INDIA_MEMBER",
    "403/400",
    !!addUsa.json?.errors?.[0]?.message &&
      /outside your country|multiple countries/i.test(addUsa.json.errors[0].message),
    addUsa.json?.errors?.[0]?.message,
  );

  const myCart = await gql(INDIA_MEMBER_TOKEN, "query{myCart{items{menuItemId quantity}}}");
  const qCart = (myCart.json?.data?.myCart?.items || []).find(
    (x) => x.menuItemId === INDIA_MENU_ITEM_ID,
  )?.quantity;
  add("myCart quantity", "qty=3", qCart === 3, `qty=${qCart}`);

  const rm = await gql(
    INDIA_MEMBER_TOKEN,
    "mutation($id:ID!){removeFromCart(input:{menuItemId:$id}){items{menuItemId}}}",
    { id: INDIA_MENU_ITEM_ID },
  );
  const still = (rm.json?.data?.removeFromCart?.items || []).some(
    (x) => x.menuItemId === INDIA_MENU_ITEM_ID,
  );
  add("removeFromCart existing", "SUCCESS", !still, "removed");

  const rm404 = await gql(
    INDIA_MEMBER_TOKEN,
    "mutation($id:ID!){removeFromCart(input:{menuItemId:$id}){id}}",
    { id: INDIA_MENU_ITEM_ID },
  );
  add(
    "removeFromCart non-existing",
    "404",
    !!rm404.json?.errors?.[0]?.message && /not found/i.test(rm404.json.errors[0].message),
    rm404.json?.errors?.[0]?.message,
  );

  // Step 5: createOrder
  const coEmpty = await gql(INDIA_MEMBER_TOKEN, "mutation{createOrder{id}}");
  add(
    "createOrder empty cart",
    "400",
    !!coEmpty.json?.errors?.[0]?.message &&
      /cart is empty/i.test(coEmpty.json.errors[0].message),
    coEmpty.json?.errors?.[0]?.message,
  );

  await gql(INDIA_MEMBER_TOKEN, mAdd, { id: INDIA_MENU_ITEM_ID, q: 2 });
  const co = await gql(
    INDIA_MEMBER_TOKEN,
    "mutation{createOrder{id status country totalAmount}}",
  );
  const ORDER_ID_CREATED = co.json?.data?.createOrder?.id;
  add(
    "createOrder valid",
    "CREATED",
    co.json?.data?.createOrder?.status === "CREATED",
    `id=${ORDER_ID_CREATED}`,
  );

  // Step 6: checkout RBAC + ownership
  const memberCheckout = await gql(
    INDIA_MEMBER_TOKEN,
    "mutation($id:ID!){checkout(orderId:$id){id status}}",
    { id: ORDER_ID_CREATED },
  );
  add(
    "MEMBER checkout",
    "403",
    !!memberCheckout.json?.errors?.[0]?.message &&
      /insufficient role/i.test(memberCheckout.json.errors[0].message),
    memberCheckout.json?.errors?.[0]?.message,
  );

  // manager-owned order checkout (cannot checkout someone else's order by design)
  const miMgr = await gql(INDIA_MANAGER_TOKEN, qMenu, { id: INDIA_REST });
  const mgrItem = miMgr.json?.data?.menuItems?.[0]?.id;
  await gql(INDIA_MANAGER_TOKEN, mAdd, { id: mgrItem, q: 1 });
  const mgrOrder = await gql(INDIA_MANAGER_TOKEN, "mutation{createOrder{id status}}");
  const mgrOrderId = mgrOrder.json?.data?.createOrder?.id;
  const mgrCheckout = await gql(
    INDIA_MANAGER_TOKEN,
    "mutation($id:ID!){checkout(orderId:$id){id status}}",
    { id: mgrOrderId },
  );
  add(
    "MANAGER checkout own order",
    "PAID",
    mgrCheckout.json?.data?.checkout?.status === "PAID",
    mgrCheckout.json?.data?.checkout?.status,
  );

  const mgrCheckoutAgain = await gql(
    INDIA_MANAGER_TOKEN,
    "mutation($id:ID!){checkout(orderId:$id){id status}}",
    { id: mgrOrderId },
  );
  add(
    "checkout again",
    "400",
    !!mgrCheckoutAgain.json?.errors?.[0]?.message &&
      /created status/i.test(mgrCheckoutAgain.json.errors[0].message),
    mgrCheckoutAgain.json?.errors?.[0]?.message,
  );

  // Step 7: cancel
  const memberCancel = await gql(
    INDIA_MEMBER_TOKEN,
    "mutation($id:ID!){cancelOrder(orderId:$id){id status}}",
    { id: ORDER_ID_CREATED },
  );
  add(
    "MEMBER cancel",
    "403",
    !!memberCancel.json?.errors?.[0]?.message &&
      /insufficient role/i.test(memberCancel.json.errors[0].message),
    memberCancel.json?.errors?.[0]?.message,
  );

  await gql(INDIA_MANAGER_TOKEN, mAdd, { id: mgrItem, q: 1 });
  const mgrOrder2 = await gql(INDIA_MANAGER_TOKEN, "mutation{createOrder{id status}}");
  const mgrOrder2Id = mgrOrder2.json?.data?.createOrder?.id;
  const mgrCancel = await gql(
    INDIA_MANAGER_TOKEN,
    "mutation($id:ID!){cancelOrder(orderId:$id){id status}}",
    { id: mgrOrder2Id },
  );
  add(
    "MANAGER cancel CREATED",
    "CANCELLED",
    mgrCancel.json?.data?.cancelOrder?.status === "CANCELLED",
    mgrCancel.json?.data?.cancelOrder?.status,
  );

  const mgrCancelPaid = await gql(
    INDIA_MANAGER_TOKEN,
    "mutation($id:ID!){cancelOrder(orderId:$id){id status}}",
    { id: mgrOrderId },
  );
  add(
    "MANAGER cancel PAID",
    "400",
    !!mgrCancelPaid.json?.errors?.[0]?.message &&
      /created/i.test(mgrCancelPaid.json.errors[0].message),
    mgrCancelPaid.json?.errors?.[0]?.message,
  );

  // Step 8: payment methods (ADMIN)
  const pmOk = await gql(
    ADMIN_TOKEN,
    "mutation($uid:ID!){addPaymentMethod(input:{userId:$uid,label:\"Work card\",last4:\"4242\",brand:\"VISA\",country:INDIA}){id userId country label}}",
    { uid: INDIA_MEMBER_ID },
  );
  const PAYMENT_METHOD_ID = pmOk.json?.data?.addPaymentMethod?.id;
  add("ADMIN addPaymentMethod ok", "SUCCESS", !!PAYMENT_METHOD_ID, `id=${PAYMENT_METHOD_ID}`);

  const pmBad = await gql(
    ADMIN_TOKEN,
    "mutation($uid:ID!){addPaymentMethod(input:{userId:$uid,label:\"Bad\",last4:\"4242\",brand:\"VISA\",country:USA}){id}}",
    { uid: INDIA_MEMBER_ID },
  );
  add(
    "ADMIN addPaymentMethod wrong country",
    "400",
    !!pmBad.json?.errors?.[0]?.message && /must match/i.test(pmBad.json.errors[0].message),
    pmBad.json?.errors?.[0]?.message,
  );

  const pmUpd = await gql(
    ADMIN_TOKEN,
    "mutation($id:ID!){updatePaymentMethod(input:{id:$id,label:\"Updated\",brand:\"MASTERCARD\",last4:\"1111\"}){id label brand last4 country}}",
    { id: PAYMENT_METHOD_ID },
  );
  add(
    "ADMIN updatePaymentMethod",
    "SUCCESS",
    pmUpd.json?.data?.updatePaymentMethod?.label === "Updated",
    pmUpd.json?.data?.updatePaymentMethod?.label,
  );

  const pmDel = await gql(
    ADMIN_TOKEN,
    "mutation($id:ID!){deletePaymentMethod(id:$id)}",
    { id: PAYMENT_METHOD_ID },
  );
  add(
    "ADMIN deletePaymentMethod",
    "true",
    pmDel.json?.data?.deletePaymentMethod === true,
    String(pmDel.json?.data?.deletePaymentMethod),
  );

  const memAddPm = await gql(
    INDIA_MEMBER_TOKEN,
    "mutation($uid:ID!){addPaymentMethod(input:{userId:$uid,label:\"X\",last4:\"4242\",brand:\"VISA\",country:INDIA}){id}}",
    { uid: INDIA_MEMBER_ID },
  );
  add(
    "MEMBER addPaymentMethod",
    "403",
    !!memAddPm.json?.errors?.[0]?.message &&
      /insufficient role/i.test(memAddPm.json.errors[0].message),
    memAddPm.json?.errors?.[0]?.message,
  );

  // Step 9: ownership
  const otherCheckout = await gql(
    INDIA_MANAGER_TOKEN,
    "mutation($id:ID!){checkout(orderId:$id){id status}}",
    { id: ORDER_ID_CREATED },
  );
  add(
    "MANAGER checkout other user order",
    "403 Not your order",
    !!otherCheckout.json?.errors?.[0]?.message &&
      /not your order/i.test(otherCheckout.json.errors[0].message),
    otherCheckout.json?.errors?.[0]?.message,
  );

  const adminCheckoutOther = await gql(
    ADMIN_TOKEN,
    "mutation($id:ID!){checkout(orderId:$id){id status}}",
    { id: ORDER_ID_CREATED },
  );
  add(
    "ADMIN checkout other user CREATED",
    "PAID",
    adminCheckoutOther.json?.data?.checkout?.status === "PAID",
    adminCheckoutOther.json?.data?.checkout?.status,
  );

  const usaAccessIndia = await gql(
    USA_MEMBER_TOKEN,
    "mutation($id:ID!){checkout(orderId:$id){id}}",
    { id: ORDER_ID_CREATED },
  );
  add(
    "USA user access INDIA order",
    "403",
    !!usaAccessIndia.json?.errors?.[0]?.message,
    usaAccessIndia.json?.errors?.[0]?.message,
  );

  // Report
  console.log(`\nGraphQL URL: ${URI}`);
  console.log("\nTEST REPORT");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}  expect=${r.expect}  ${r.details ?? ""}`);
  }
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log(`\nFAILED: ${failed.length}`);
    process.exit(2);
  }
  console.log(`\nALL TESTS PASSED (${results.length})`);
}

main().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});

