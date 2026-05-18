let m = "";
const instanceIndex = '1';

if (args[1].value) {
  m = args[1].value[0];

  // Declare PreSharedKey first
  declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.PreSharedKey.1.KeyPassphrase`, null, {value: m});

  // Try to read back the declared value
  let pskCheck = declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.PreSharedKey.1.KeyPassphrase`, {value: Date.now()});
  
  // Only declare the second one if the first did not succeed
  if (!pskCheck.size || !pskCheck.value) {
    declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.KeyPassphrase`, null, {value: m});
  }
}
else {
  let psk = declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.PreSharedKey.1.KeyPassphrase`, {value: Date.now()});
  let kp = declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.KeyPassphrase`, {value: Date.now()});
  if (psk.size) {
    m = psk.value[0];
  } else if (kp.size) {
    m = kp.value[0];
  }
}

return {writable: true, value: [m, "xsd:string"]};
