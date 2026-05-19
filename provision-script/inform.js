// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
// Device SN as user name
const username = declare("DeviceID.SerialNumber", { value: 1 }).value[0];
// Password will be fixed for a given device because Math.random() is seeded with device ID by default.
const password = Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);

// Refresh intervals
const daily = Date.now() - 86400000;
const fiveMin = Date.now() - 300000;

// Inform interval configuration (in seconds for ONU)
const informInterval = 300;
const informTime = daily % 86400000; // Unique inform offset per device for better load distribution

// ACS server url
const acsUrl = "{{ACS_URL}}";


// ==========================================
// 2. MANAGEMENT & ACS CONFIGURATION
// ==========================================
declare("InternetGatewayDevice.ManagementServer.ConnectionRequestUsername", { value: daily }, { value: username });
declare("InternetGatewayDevice.ManagementServer.ConnectionRequestPassword", { value: daily }, { value: password });
declare("InternetGatewayDevice.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
declare("InternetGatewayDevice.ManagementServer.PeriodicInformInterval", { value: daily }, { value: informInterval });
declare("InternetGatewayDevice.ManagementServer.URL", { value: daily }, { value: acsUrl });
declare("InternetGatewayDevice.ManagementServer.Username", { value: daily }, { value: "cpe" });
declare("InternetGatewayDevice.ManagementServer.Password", { value: daily }, { value: "backtohome" });


// ==========================================
// 3. DHCP & NETWORK CONFIGURATION
// ==========================================
// Configure DHCP Lease time
declare("InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.DHCPLeaseTime", { value: daily }, { value: 3600 });
// Enable Huawei LAN L3
declare("InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.*.X_HW_L3Enable", { value: daily }, { value: true });


// ==========================================
// 4. FIREWALL & SECURITY
// ==========================================
// Set firewall huawei user-defined
declare("InternetGatewayDevice.X_HW_Security.X_HW_FirewallLevel", { value: fiveMin }, { value: "Custom" });



