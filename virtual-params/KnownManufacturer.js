let result = "Other"
const knownManufacturers = [
    "CIOT",
    "CMDC",
    "FiberHome",
    "GGCL",
    "HWTC",
    "Huawei Technologies Co., Ltd",
    "NNSC",
    "XSFG",
    "YEKF",
    "ZICG",
    "ZTE",
    "ZTEG",
    "ZXIC"
];

let manu = declare("DeviceID.Manufacturer", {value: Date.now()});
if(knownManufacturers.includes(manu.value[0])){
    result = manu.value[0];
} else {
    result = "Other"
}
return {writable: false, value: [result, "xsd:string"]};