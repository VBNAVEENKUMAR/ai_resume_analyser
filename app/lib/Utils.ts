export function formatSize(bytes:number):string {
    if(bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB","MB","GB","TB","PB","EB","ZB","YB","YB"];

    const number = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes/Math.pow(k,number)).toFixed(2)) + " " + sizes[number];

}

export const generatedUUID = () =>  {
    return crypto.randomUUID();
}