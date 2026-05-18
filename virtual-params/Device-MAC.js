const cacheAge = 600000; // 10 minutes
let m = "";

const paths = [
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.*.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.*.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.1.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.1.MACAddress",
  "InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.*.MACAddress",
  "InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MACAddress"
];

for (let path of paths) {
  let d = declare(path, {value: Date.now() - cacheAge});
  for (let item of d) {
    if (item.value && item.value[0] && item.value[0] !== "00:00:00:00:00:00") {
      m = item.value[0];
      break;
    }
  }
  if (m) break;
}

return {writable: false, value: [m, "xsd:string"]};
