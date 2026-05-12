let result = '';

function getParameterValue(keys) {
    for (let key of keys) {
        let d = declare(key, {path: Date.now() - (120 * 1000), value: Date.now()});

        for (let item of d) {
            if (item.value && item.value[0]) {
                return item.value[0];
            }
        }
    }

    return 'UNKNOWN';
}

if ("value" in args[1]) {
    result = args[1].value[0];
} else {
    let keys = [
        'InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username'
    ];

    result = getParameterValue(keys);
}

return {writable: false, value: [result, "xsd:string"]};