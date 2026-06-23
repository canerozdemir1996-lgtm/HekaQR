"use client";

import { useMemo } from "react";
import { sanitizeHtml, sanitizeUrl } from "@/lib/utils/htmlSanitizer";

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BR",
  "EM",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "U",
  "UL",
]);

const DROP_TAGS = new Set(["EMBED", "IFRAME", "LINK", "META", "OBJECT", "SCRIPT", "STYLE"]);

function trustedImagePrefix() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/`;
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function sanitizeMessageHtml(input: string | null | undefined) {
  if (!input) return "";
  if (typeof window === "undefined") return sanitizeHtml(input);

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const root = documentNode.body.firstElementChild as HTMLElement | null;
  const trustedPrefix = trustedImagePrefix();

  if (!root) return "";

  const walk = (node: ParentNode) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const element = child as HTMLElement;
      const tag = element.tagName.toUpperCase();

      if (DROP_TAGS.has(tag)) {
        element.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        unwrapElement(element);
        continue;
      }

      const rawHref = element.getAttribute("href");
      const rawSource = element.getAttribute("src");
      const rawAlt = element.getAttribute("alt") ?? "";

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }

      if (tag === "A") {
        const href = sanitizeUrl(rawHref);
        if (href) {
          element.setAttribute("href", href);
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noreferrer noopener");
        } else {
          unwrapElement(element);
          continue;
        }
      }

      if (tag === "IMG") {
        const source = rawSource ?? "";
        if (!trustedPrefix || !source.startsWith(trustedPrefix)) {
          element.remove();
          continue;
        }

        element.setAttribute("src", source);
        element.setAttribute("alt", rawAlt);
        element.setAttribute("decoding", "async");
      }

      walk(element);
    }
  };

  walk(root);
  return root.innerHTML;
}

export function SafeMessageHtml({
  html,
  className = "",
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const safeHtml = useMemo(() => sanitizeMessageHtml(html), [html]);

  return (
    <div
      className={`message-html break-words [&_a]:font-semibold [&_a]:text-violet-600 [&_a]:underline-offset-2 hover:[&_a]:underline dark:[&_a]:text-violet-300 [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200 [&_img]:object-contain dark:[&_img]:border-white/10 [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-1 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:space-y-1 ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
