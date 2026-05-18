let m = "";
let writable = true;

if (args[1].value) {
  m = args[1].value[0];
  declare("InternetGatewayDevice.X_CU_Function.Web.AdminPassword", null, {value: m});
  declare("InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword", null, {value: m});
  declare("InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.Password", null, {value: m});
  declare("InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Password", null, {value: m});
  declare("InternetGatewayDevice.DeviceInfo.X_FH_Account.X_FH_WebUserInfo.WebSuperPassword", null, {value: m});
  declare("InternetGatewayDevice.User.1.Password", null, {value: m});
  declare("InternetGatewayDevice.X_Authentication.WebAccount.Password", null, {value: m});
  declare("InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password", null, {value: m});
  declare("InternetGatewayDevice.X_ZTE-COM_UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword", null, {value: m});
}
else {
  let xcu = declare("InternetGatewayDevice.X_CU_Function.Web.AdminPassword", {value: Date.now()});
  let xauth = declare("InternetGatewayDevice.X_Authentication.WebAccount.Password", {value: Date.now()});
  let xhw = declare("InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.Password", {value: Date.now()});
  let xct = declare("InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password", {value: Date.now()});
  let xcmcc = declare("InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Password", {value: Date.now()});
  let xfh = declare("InternetGatewayDevice.DeviceInfo.X_FH_Account.X_FH_WebUserInfo.WebSuperPassword", {value: Date.now()});
  let user = declare("InternetGatewayDevice.User.1.Password", {value: Date.now()});
  let xzte = declare("InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword", {value: Date.now()});
  let xzte0 = declare("InternetGatewayDevice.X_ZTE-COM_UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword", {value: Date.now()});
  if (xcu.size) {
    m = xcu.value[0];
  } else if (xauth.size) {
    m = xauth.value[0];
  } else if (xhw.size) {
    m = xhw.value[0];
  } else if (xct.size) {
    m = xct.value[0];
  } else if (xcmcc.size) {
    m = xcmcc.value[0];
  } else if (xfh.size) {
    m = xfh.value[0];
  } else if (user.size) {
    m = user.value[0];
  } else if (xzte.size) {
    m = xzte.value[0];
  } else if (xzte0.size) {
    m = xzte0.value[0];
  } else {
    writable = false;
  }
}

return {writable: writable, value: [m, "xsd:string"]};
