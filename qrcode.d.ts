declare module "qrcode" {
  import type { Buffer } from "buffer";

  type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  type QRCodeOptions = {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  };

  type SVGOptions = QRCodeOptions & { type: "svg" };
  type PNGOptions = QRCodeOptions & { type: "png" };

  const QRCode: {
    toString(text: string, options: SVGOptions): Promise<string>;
    toBuffer(text: string, options: PNGOptions): Promise<Buffer>;
  };

  export default QRCode;
}

