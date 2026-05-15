let m = "";

// 1. Check WAN PPP Connections (1 through 4)
let wanMacs = declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.[1,2,3,4].MACAddress", {value: Date.now()});
for (let p of wanMacs) {
  if (p.value && p.value[0] && p.value[0] !== "00:00:00:00:00:00") {
    m = p.value[0];
    break;
  }
}

// 2. If not found, check LAN Ethernet Interfaces (1 through 4)
if (!m) {
  let lanMacs = declare("InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.[1,2,3,4].MACAddress", {value: Date.now()});
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
