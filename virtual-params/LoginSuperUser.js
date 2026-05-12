let m = "";
let writable = true;

if (args[1].value) {
  m = args[1].value[0];
  declare(`InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.UserName`, null, {value: m});
  declare(`InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Username`, null, {value: m});
}
else {
  let xhw = declare(`InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.UserName`, {value: Date.now()});
  let xcmcc = declare(`InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Username`, {value: Date.now()});
  if (xhw.size) {
    m = xhw.value[0];
  } else if (xcmcc.size) {
    m = xcmcc.value[0];
  } else {
    writable = false;
  }
}

return {writable: writable, value: [m, "xsd:string"]};