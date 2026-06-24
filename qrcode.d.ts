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

declare module "pdf-lib" {
  export const PDFDocument: {
    create(): Promise<{
      addPage: (size?: [number, number]) => {
        drawImage: (image: unknown, options: Record<string, unknown>) => void;
        drawRectangle: (options: Record<string, unknown>) => void;
        drawText: (text: string, options: Record<string, unknown>) => void;
      };
      embedPng: (data: Uint8Array | Buffer) => Promise<unknown>;
      embedFont: (font: unknown) => Promise<{
        widthOfTextAtSize: (text: string, size: number) => number;
      }>;
      save: () => Promise<Uint8Array>;
    }>;
  };
  export const StandardFonts: Record<string, unknown>;
  export function rgb(r: number, g: number, b: number): unknown;
}

declare module "resend" {
  export class Resend {
    constructor(apiKey: string);
    emails: {
      send: (options: {
        from: string;
        to: string | string[];
        subject: string;
        html: string;
      }) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  }
}
