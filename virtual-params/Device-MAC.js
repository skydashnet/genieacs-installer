let m = "";

// 1. Check WAN PPP Connections 1 through 4
for (let i = 1; i <= 4; i++) {
  let path = "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection." + i + ".MACAddress";
  let p = declare(path, {value: Date.now()});
  if (p.value && p.value[0] && p.value[0] !== "00:00:00:00:00:00") {
    m = p.value[0];
    break;
  }
}

// 2. If not found, check LAN Ethernet Interfaces 1 through 4
if (!m) {
  for (let i = 1; i <= 4; i++) {
    let path = "InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig." + i + ".MACAddress";
    let p = declare(path, {value: Date.now()});
    if (p.value && p.value[0] && p.value[0] !== "00:00:00:00:00:00") {
      m = p.value[0];
      break;
    }
  }
}

// 3. Final fallback: LAN Host Management MAC
if (!m) {
  let fallback = declare("InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MACAddress", {value: Date.now()});
  if (fallback.value && fallback.value[0] && fallback.value[0] !== "00:00:00:00:00:00") {
    m = fallback.value[0];
  }
}

return {writable: false, value: [m, "xsd:string"]};
