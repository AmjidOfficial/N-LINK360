const NLINK_ENDPOINT = 'https://nigvxsjrvkmynwduvemy.supabase.co/functions/v1/sync-master-data-from-sheets';

function getToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('NLINK_SHEET_TOKEN');
  if (!token) throw new Error('Missing Script Property: NLINK_SHEET_TOKEN');
  return token;
}

function sheetRows_(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1).filter(row => row.some(v => String(v).trim() !== '')).map(row => {
    const item = {};
    headers.forEach((header, i) => item[header] = row[i]);
    return item;
  });
}

function normalize_(rows, aliases) {
  return rows.map(row => {
    const out = {};
    Object.keys(aliases).forEach(key => {
      const candidates = aliases[key];
      for (const candidate of candidates) {
        if (row[candidate] !== undefined && String(row[candidate]).trim() !== '') {
          out[key] = row[candidate];
          break;
        }
      }
    });
    return out;
  });
}

function syncMasterDataToNLink() {
  const payload = {
    users: normalize_(sheetRows_('Users'), {
      userCode: ['userCode', 'User Code', 'user_code'],
      email: ['email', 'Email', 'Login Email'],
      fullName: ['fullName', 'Full Name', 'name'],
      status: ['status', 'Status'],
      authUserId: ['authUserId', 'Auth User ID', 'auth_user_id']
    }),
    employees: normalize_(sheetRows_('Team'), {
      employeeCode: ['employeeCode', 'Employee Code', 'employee_code'],
      fullName: ['fullName', 'Full Name', 'name'],
      role: ['role', 'Role', 'designation'],
      email: ['email', 'Email'],
      phone: ['phone', 'Phone', 'mobile'],
      region: ['region', 'Region'],
      territory: ['territory', 'Territory'],
      department: ['department', 'Department'],
      status: ['status', 'Status']
    }),
    customers: normalize_(sheetRows_('Dealers'), {
      customerCode: ['customerCode', 'Customer Code', 'customer_code'],
      companyName: ['companyName', 'Company Name', 'Business Name', 'name'],
      contactPerson: ['contactPerson', 'Contact Person'],
      phone: ['phone', 'Phone', 'mobile'],
      type: ['type', 'Type', 'Customer Type'],
      address: ['address', 'Address'],
      city: ['city', 'City', 'town', 'Town'],
      area: ['area', 'Area'],
      territory: ['territory', 'Territory', 'route', 'Route'],
      creditLimit: ['creditLimit', 'Credit Limit'],
      creditDays: ['creditDays', 'Credit Days'],
      openingBalance: ['openingBalance', 'Opening Balance'],
      status: ['status', 'Status']
    }),
    products: normalize_(sheetRows_('Products'), {
      skuCode: ['skuCode', 'SKU Code', 'sku_code'],
      productCode: ['productCode', 'Product Code', 'product_code'],
      name: ['name', 'Name', 'SKU Name', 'Description'],
      brandName: ['brandName', 'Brand Name', 'Brand'],
      model: ['model', 'Model'],
      wattage: ['wattage', 'Wattage'],
      packingUnit: ['packingUnit', 'Packing Unit'],
      cartonQuantity: ['cartonQuantity', 'Carton Quantity', 'Units Per Carton'],
      costPrice: ['costPrice', 'Cost Price'],
      tradePrice: ['tradePrice', 'Trade Price'],
      dealerPrice: ['dealerPrice', 'Dealer Price'],
      retailPrice: ['retailPrice', 'Retail Price'],
      taxRate: ['taxRate', 'Tax Rate'],
      reorderLevel: ['reorderLevel', 'Reorder Level'],
      barcode: ['barcode', 'Barcode'],
      status: ['status', 'Status']
    })
  };

  const response = UrlFetchApp.fetch(NLINK_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'X-NLINK-SHEET-TOKEN': getToken_() },
    payload: JSON.stringify(payload)
  });

  const body = response.getContentText();
  const code = response.getResponseCode();
  const logSheet = SpreadsheetApp.getActive().getSheetByName('Sync_Log') || SpreadsheetApp.getActive().insertSheet('Sync_Log');
  if (logSheet.getLastRow() === 0) logSheet.appendRow(['Timestamp', 'HTTP', 'Result']);
  logSheet.appendRow([new Date(), code, body]);
  if (code < 200 || code >= 300) throw new Error('N-LINK master sync failed: ' + body);
  return body;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('N-LINK 360')
    .addItem('Sync Master Data to N-LINK', 'syncMasterDataToNLink')
    .addToUi();
}
