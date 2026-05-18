const cacheAge = 600000; // 10 minutes
let result = '';

function getParameterValue(keys) {
    for (let key of keys) {
        let d = declare(key, {path: Date.now() - (120 * 1000), value: Date.now() - cacheAge});

        for (let item of d) {
            if (item.value && item.value[0] >= 0 ) {
                return Math.ceil(10 * Math.log10(item.value[0] / 10000));
            } else if (item.value && item.value[0] < 0) {
                return item.value[0]; 
            }
        }
    }

    return 'N/A';
}

if ("value" in args[1]) {
    result = args[1].value[0];
} else {
    let keys = [
        'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower',
        'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
        'InternetGatewayDevice.WANDevice.1.X_CU_WANEPONInterfaceConfig.OpticalTransceiver.RXPower',
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower',
      	'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower',
      	'InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.RXPower'
    ];

    result = getParameterValue(keys);
}

return {writable: false, value: [result, "xsd:int"]};

