declare module "read-excel-file/browser" {
  type Cell = string | number | boolean | null;
  const readXlsxFile: (input: Blob | File) => Promise<Cell[][]>;
  export default readXlsxFile;
}
