const cacheAge = 600000; // 10 minutes
let m = "";
const instanceIndex = '1';

if (args[1].value) {
  m = args[1].value[0];
  declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.BeaconType`, null, {value: m});
}
else {
  let ssid1 = declare(`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${instanceIndex}.BeaconType`, {value: Date.now() - cacheAge});
  if (ssid1.size) {
    m = ssid1.value[0];
  }
}

return {writable: true, value: [m, "xsd:string"]};