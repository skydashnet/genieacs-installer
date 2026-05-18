const cacheAge = 600000; // 10 minutes
let result = 0;
let keys = [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.TotalAssociations'
];

result = getParameterValue(keys);

function getParameterValue(keys) {
    let total = 0;
    for (let key of keys) {
        let d = declare(key, {path: Date.now() - (120 * 1000), value: Date.now() - cacheAge});
        for (let item of d) {
            if (item.value && !isNaN(parseInt(item.value[0]))) {
                total += parseInt(item.value[0]);
            }
        }
    }
    return total;
}

return {writable: false, value: [result, "xsd:int"]};
