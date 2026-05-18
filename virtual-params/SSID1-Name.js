let m = "";
const instanceIndex = '1';

if (args[1].value) {
  m = args[1].value[0];
  declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.SSID`, null, {value: m});
}
else {
  let ssid1 = declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.SSID`, {value: Date.now()});
  if (ssid1.size) {
    m = ssid1.value[0];
  }
}

return {writable: true, value: [m, "xsd:string"]};