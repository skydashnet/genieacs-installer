let m = "";

// 1. Check WAN PPP Connections
let wanMacs = declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.*.MACAddress", {value: Date.now()});
for (let p of wanMacs) {
  if (p.value && p.value[0] && p.value[0] !== "00:00:00:00:00:00") {
    m = p.value[0];
    break;
  }
}

// 2. If not found, check LAN Ethernet Interfaces
if (!m) {
  let lanMacs = declare("InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.*.MACAddress", {value: Date.now()});
  for (let p of lanMacs) {
    if (p.value && p.value[0] && p.value[0] !== "00:00:00:00:00:00") {
      m = p.value[0];
      break;
    }
  }
}

// 3. Final fallback: LAN Host Management MAC
if (!m) {
  let fallback = declare("InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MACAddress", {value: Date.now()});
  if (fallback.size && fallback.value[0] && fallback.value[0] !== "00:00:00:00:00:00") {
    m = fallback.value[0];
  }
}

return {writable: false, value: [m, "xsd:string"]};
