const cacheAge = 600000; // 10 minutes
let m = "";

let xhw0 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANIPConnection.*.X_HW_VLAN`, { value: Date.now() - cacheAge });
let xhw1 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.X_HW_VLAN`, { value: Date.now() - cacheAge });
let xcmcc0 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.*.X_CMCC_VLANIDMark`, { value: Date.now() - cacheAge });
let xcmcc1 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.*.X_CMCC_VLANIDMark`, { value: Date.now() - cacheAge });
let xfh0 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.*.X_FH_ServiceList`, { value: Date.now() - cacheAge });
let xfh1 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.*.X_FH_ServiceList`, { value: Date.now() - cacheAge });
let xzte0 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.*.X_ZTE-COM_VLANID`, { value: Date.now() - cacheAge });
let xzte1 = declare(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.*.X_ZTE-COM_VLANID`, { value: Date.now() - cacheAge });

if (xhw0.size || xhw1.size) {
    m = "XHW";
} else if (xcmcc0.size || xcmcc1.size) {
    m = "XCMCC";
} else if (xfh0.size || xfh1.size) {
    m = "XFH";
} else if (xzte0.size || xzte1.size) {
    m = "XZTE";
} else {
    m = "Other"
}

return { writable: false, value: [m, "xsd:string"] };