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


// ==========================================
// 5. AUTO-PROVISION PPPOE WAN IF MISSING (ONLY FOR TAGGED DEVICES)
// ==========================================
let autoProvisionTag = declare("Tags.AutoProvision", { value: 1 });

if (autoProvisionTag.value && autoProvisionTag.value[0] === true) {
    // 1. Auto-provision PPPoE WAN
    let pppConn = declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Enable", { value: Date.now() });

    if (pppConn.size === 0) {
        log("GenieACS Auto-Provisioning: Tagged device missing PPPoE WAN. Creating new PPPoE WAN connection...");

        // Create first WANPPPConnection instance under WANConnectionDevice.1
        declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Enable", null, { value: true });
        declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ConnectionType", null, { value: "IP_Routed" });
        declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.AddressingType", null, { value: "PPPoE" });
        declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.NATEnabled", null, { value: true });
        declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username", null, { value: "" });
        declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password", null, { value: "" });
    }

    // 2. Configure SSID4 to EtherGig (only if not already set correctly)
    let ssid4 = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.SSID", { value: Date.now() });
    let ssid4Enabled = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.Enable", { value: Date.now() });

    if (ssid4.value && ssid4.value[0] !== "EtherGig") {
        declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.SSID", null, { value: "EtherGig" });
    }
    if (ssid4Enabled.value && ssid4Enabled.value[0] !== false) {
        declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.4.Enable", null, { value: false });
    }

    // 3. Mark provisioning complete: remove AutoProvision tag, add provisioned tag
    declare("Tags.AutoProvision", null, { value: false });
    declare("Tags.provisioned", null, { value: true });
}
