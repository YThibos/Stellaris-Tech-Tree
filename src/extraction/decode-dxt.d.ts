declare module 'decode-dxt' {
  function decodeDxt(data: DataView, width: number, height: number, format: string): Uint8Array;
  export default decodeDxt;
}
