// ==========================================
// CUSTOM PROVISION EXAMPLE
// ==========================================
// This script is protected because its name starts with 'custom-'.
// It will never be deleted or overwritten by './genieacs-import.sh'
// if it already exists inside your GenieACS database.
// You can customize it freely via the Web UI!

// Put your custom provisioning script above this line
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

log("Custom protected provision script ran successfully!");
