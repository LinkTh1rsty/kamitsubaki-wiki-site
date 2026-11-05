import remarkSpeech,{rehypeSpeech} from './speechMarkdown.mjs';
import rehypeExternalLinks from "rehype-external-links";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { wikiHtmlSchema } from "./htmlPolicy.mjs";
import remarkWikiShortcodes from "./wikiShortcodes.mjs";
import remarkMediaEmbed, {
  rehypeMaterializeMediaEmbeds,
} from "./mediaEmbed.mjs";
import rehypeRawHtmlMarkdownLinks from "./rawHtmlMarkdownLinks.mjs";
import rehypeDetailsSummary from "./detailsSummary.mjs";
import remarkImageCaptions from "./imageCaptions.mjs";
import rehypeDocumentAnchors from "./documentAnchors.mjs";

export const wikiRemarkPlugins = [
  remarkSpeech,
  remarkWikiShortcodes,
  remarkMediaEmbed,
  remarkImageCaptions,
];
// Authored HTML is sanitized before trusted media and KaTeX are materialized.
export const wikiRehypePlugins = [
  rehypeRawHtmlMarkdownLinks,
  rehypeRaw,
  [rehypeSanitize, wikiHtmlSchema],
  [rehypeDocumentAnchors, { prefix: wikiHtmlSchema.clobberPrefix }],
  rehypeDetailsSummary,
  rehypeMaterializeMediaEmbeds,
  rehypeSpeech,
];
export const wikiExternalLinks = [
  rehypeExternalLinks,
  { target: "_blank", rel: ["noopener", "noreferrer"] },
];
