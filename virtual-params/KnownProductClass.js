const cacheAge = 600000; // 10 minutes
let result = "Other"
const knownProductClass = [
    "F460",
    "F609",
    "F650",
    "F663NV3a",
    "F663NV3A",
    "F663NV9",
    "F670",
    "F670L",
    "G663 XPON",
    "G663-XPON",
    "G665 XPON",
    "G680L XPON",
    "G99 XPON",
    "GM219",
    "GM220-S",
    "GM220-S XPON",
    "GM630",
    "H1s-3",
    "HG6145D2",
    "HG6245N",
    "HG8145V5",
    "HG8245A",
    "HG8245H",
    "HG8245H5",
    "HG8546M",
    "HS8145C5",
    "MQ220",
    "XSF609",
    "ZXHN F450(EPON ONU)"
];

let prod = declare("DeviceID.ProductClass", {value: Date.now() - cacheAge});
if(knownProductClass.includes(prod.value[0])){
    result = prod.value[0];
} else {
    result = "Other"
}
return {writable: false, value: [result, "xsd:string"]};