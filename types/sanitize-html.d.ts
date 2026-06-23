declare module "sanitize-html" {
  type Frame = {
    tag: string;
    attribs: Record<string, string>;
  };

  type TransformResult = {
    tagName: string;
    attribs: Record<string, string>;
  };

  type Options = {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemesByTag?: Record<string, string[]>;
    exclusiveFilter?: (frame: Frame) => boolean;
    transformTags?: Record<string, (tagName: string, attribs: Record<string, string>) => TransformResult>;
    disallowedTagsMode?: "discard" | "escape" | "recursiveEscape";
  };

  export default function sanitizeHtml(input: string, options?: Options): string;
}
