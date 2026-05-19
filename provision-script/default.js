const daily = Date.now() - 86400000;
const hourly = Date.now() - 3600000;
const fiveMin = Date.now() - 300000;

// ==========================================
// 1. DEVICE METRICS & SPECIFICATIONS
// ==========================================
declare("InternetGatewayDevice.DeviceInfo.HardwareVersion", { path: daily, value: daily });
declare("InternetGatewayDevice.DeviceInfo.SoftwareVersion", { path: daily, value: daily });
declare("InternetGatewayDevice.DeviceInfo.UpTime", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.ManagementServer.ConnectionRequestURL", { path: fiveMin, value: fiveMin });

// Device Virtual Parameters
declare("VirtualParameters.Device-MAC", { path: daily, value: daily });
declare("VirtualParameters.DeviceUptime", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.KnownManufacturer", { path: daily, value: daily });
declare("VirtualParameters.KnownProductClass", { path: daily, value: daily });


// ==========================================
// 2. OPTICAL METRICS
// ==========================================
declare("VirtualParameters.OpticalTemperature", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.OpticalRXPower", { path: fiveMin, value: fiveMin });


// ==========================================
// 3. WAN METRICS & PARAMETERS
// ==========================================
// Native WAN Parameters
declare("InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.WANAccessType", { path: daily, value: daily });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionNumberOfEntries", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.*", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANIPConnection.*.*", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.X_HW_LANBIND.*", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANIPConnection.*.X_HW_LANBIND.*", { path: fiveMin, value: fiveMin });

// WAN Virtual Parameters
declare("VirtualParameters.IP-TR069", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.IP-WANIP", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.IP-WANPPP", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.WANBridge", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.PPPUsername", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.WANParameterModel", { path: fiveMin, value: fiveMin });


// ==========================================
// 4. LAN & WLAN METRICS
// ==========================================
// Native LAN/WLAN Parameters
declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.Enable", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.SSID", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.KeyPassphrase", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.BeaconType", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.TotalAssociations", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.LANDevice.*.LANEthernetInterfaceConfig.*.*", { path: fiveMin, value: fiveMin });
declare("InternetGatewayDevice.LANDevice.*.Hosts.HostNumberOfEntries", { path: fiveMin, value: fiveMin });

// Wi-Fi 2.4GHz (SSID1) & 5GHz (SSID5) Virtual Parameters
declare("VirtualParameters.SSID1-Name", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.SSID1-Password", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.SSID1-Security", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.SSID5-Name", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.SSID5-Password", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.SSID5-Security", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.TotalStations", { path: fiveMin, value: fiveMin });


// ==========================================
// 5. VLAN & INTERFACE BINDING (Virtual Parameters)
// ==========================================
// WAN IP VLANs & Bindings
declare("VirtualParameters.VLAN-IP1", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.VLAN-IP2", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.VLAN-IP3", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.VLAN-IP4", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-IP1", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-IP2", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-IP3", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-IP4", { path: fiveMin, value: fiveMin });

// WAN PPP VLANs & Bindings
declare("VirtualParameters.VLAN-PPP1", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.VLAN-PPP2", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.VLAN-PPP3", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.VLAN-PPP4", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-PPP1", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-PPP2", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-PPP3", { path: fiveMin, value: fiveMin });
declare("VirtualParameters.Binding-PPP4", { path: fiveMin, value: fiveMin });


// ==========================================
// 6. ROUTER LOGIN / ADMINISTRATIVE
// ==========================================
declare("VirtualParameters.LoginSuperUser", { path: daily, value: daily });
declare("VirtualParameters.LoginSuperPass", { path: daily, value: daily });


// ==========================================
// 7. AUTO-PROVISION PPPOE WAN IF MISSING (ONLY FOR TAGGED DEVICES)
// ==========================================
let autoProvisionTag = declare("Tags.AutoProvisionPPPoE", {value: 1});

if (autoProvisionTag.size > 0) {
  let pppConn = declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Enable", {value: Date.now()});
  
  if (pppConn.size === 0) {
    log("GenieACS Auto-Provisioning: Tagged device missing PPPoE WAN. Creating new PPPoE WAN connection...");
    
    // Create first WANPPPConnection instance under WANConnectionDevice.1
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Enable", null, {value: true});
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ConnectionType", null, {value: "IP_Routed"});
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.AddressingType", null, {value: "PPPoE"});
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.NATEnabled", null, {value: true});
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username", null, {value: ""});
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password", null, {value: ""});
  }
}
