// Static image imports resolve to a Metro asset reference (a number at runtime).
declare module '*.png' {
  const asset: number;
  export default asset;
}
declare module '*.jpg' {
  const asset: number;
  export default asset;
}
