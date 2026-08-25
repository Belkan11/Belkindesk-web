import { applyKeywordsFilter, normalizeText } from './src/utils/filterUtils.ts';
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { XMLParser } from "fast-xml-parser";

import dns from 'dns/promises';

async function isUrlSafeForSsrf(urlString: string): Promise<boolean> {
  try {
    const parsed = new URL(urlString);
    
    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Explicitly blocked hostnames
    if (hostname === 'localhost' || hostname === 'metadata.google.internal' || hostname.includes('metadata')) {
      return false;
    }

    // Attempt to resolve the hostname to check if it points to a private IP
    // Note: This isn't bulletproof against DNS rebinding, but it's a good first layer for a Node.js app
    const ips = await dns.resolve(hostname).catch(() => []);
    
    // Function to check if an IP is private/reserved
    const isPrivateIp = (ip: string) => {
      // IPv4 checks
      if (ip.startsWith('127.')) return true; // loopback
      if (ip.startsWith('10.')) return true; // class A
      if (ip.startsWith('192.168.')) return true; // class C
      if (ip.startsWith('169.254.')) return true; // link-local (metadata endpoints)
      if (ip.startsWith('0.')) return true; // current network
      
      // Class B (172.16.0.0 to 172.31.255.255)
      if (ip.startsWith('172.')) {
        const secondOctet = parseInt(ip.split('.')[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
      }
      
      // IPv6 checks (simple)
      if (ip === '::1' || ip.toLowerCase().startsWith('fc00:') || ip.toLowerCase().startsWith('fd00:') || ip.toLowerCase().startsWith('fe80:')) {
        return true;
      }
      return false;
    };

    // If the hostname itself is a raw IP, check it
    if (isPrivateIp(hostname)) {
       return false;
    }

    // Check resolved IPs
    for (const ip of ips) {
      if (isPrivateIp(ip)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// ----------------------------------------------------
// AI Provider Abstraction Registry
// ----------------------------------------------------
export interface AIProvider {
  generateContent: (params: { 
    systemInstruction: string; 
    prompt: string; 
    responseSchema?: any; 
    model?: string;
  }) => Promise<string>;
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  
  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "belkindesk-user" } }
    });
  }

  async generateContent({ systemInstruction, prompt, responseSchema, model = "gemini-2.5-flash" }: any) {
    
    let response;
    try {
      response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction, responseMimeType: responseSchema ? "application/json" : "text/plain", responseSchema }
      });
    } catch (err: any) {
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        throw new Error("Лимит AI-запросов исчерпан. Проверьте квоту или выберите другой AI provider.");
      }
      throw err;
    }

    return response?.text || "{}";
  }
}

class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') + '/chat/completions';
    this.apiKey = apiKey;
  }

  async generateContent({ systemInstruction, prompt, responseSchema, model = "gpt-3.5-turbo" }: any) {
    if (!(await isUrlSafeForSsrf(this.baseUrl))) throw new Error('SSRF Blocked');
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: responseSchema ? { type: "json_object" } : undefined
      })
    });
    if (res.status === 429) throw new Error("Лимит AI-запросов исчерпан. Проверьте квоту или выберите другой AI provider.");
    if (!res.ok) throw new Error(`OpenAI API Error: ${res.statusText}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "{}";
  }
}

export const aiProviderRegistry = {
  gemini: (apiKey?: string) => new GeminiProvider(apiKey),
  openai: (baseUrl: string, apiKey: string) => new OpenAICompatibleProvider(baseUrl, apiKey)
};

function getAiProvider(req?: any): AIProvider {
  if (!req || !req.headers) return aiProviderRegistry.gemini();
  const provider = req.headers['x-user-ai-provider'] as string || 'gemini';
  const key = req.headers['x-user-ai-key'] as string || '';
  const baseUrl = req.headers['x-user-ai-url'] as string || 'https://api.openai.com/v1';
  
  if (provider === 'openai' || provider === 'openrouter' || provider === 'custom') {
    return aiProviderRegistry.openai(baseUrl, key);
  }
  return aiProviderRegistry.gemini(key);
}

// Setup XML Parser with entity decoding
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  trimValues: true,
  parseTagValue: false,
  htmlEntities: true,
});

// Admin Auditing & Debugging Log system
interface DebugLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "gemini" | "google";
  message: string;
  details?: string;
}

const debugLogs: DebugLog[] = [];

function addLog(level: "info" | "warn" | "error" | "gemini" | "google", message: string, details?: unknown) {
  const log: DebugLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    level,
    message,
    details: details ? (typeof details === 'string' ? details : JSON.stringify(details, null, 2)) : undefined
  };
  debugLogs.unshift(log); // Add to beginning (newest first)
  if (debugLogs.length > 500) {
    debugLogs.pop(); // Keep only last 500 logs to prevent memory leaks
  }
}

// Log initial startup
addLog("info", "Сервер BelkinDESK запущен. Логирование отладки активировано.");

// Storage directory for persistent user profiles
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsersData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading users file:", err);
  }
  return {};
}

function saveUsersData(data: Record<string, unknown>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users file:", err);
  }
}

// ----------------------------------------------------
// Helper: Extract text from nested XML nodes or CDATA
// ----------------------------------------------------
function extractText(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node.trim();
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.__cdata) return String(obj.__cdata).trim();
    if (obj["#text"]) return String(obj["#text"]).trim();
    if (obj["_"]) return String(obj["_"]).trim();
    if (Array.isArray(node)) {
      return node.map(extractText).filter(Boolean).join(" ");
    }
  }
  return "";
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findAllImagesInContent(content: string, itemObj: Record<string, unknown>, origin = ''): string[] {
  const images = new Set<string>();

  const isBadImage = (url: string) => {
    if (!url) return true;
    const low = url.toLowerCase();
    return (
      low.includes("feedburner") ||
      low.includes("1x1") ||
      low.includes("pixel") ||
      low.includes("tracking") ||
      low.includes("doubleclick") ||
      low.includes("gravatar.com/avatar") ||
      low.includes("share-button") ||
      low.includes("badge") ||
      low.includes("analytics") ||
      low.startsWith("data:")
    );
  };

  const addImg = (rawUrl: string | undefined) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    let url = rawUrl.trim();
    if (url.startsWith('//')) url = `https:${url}`;
    else if (url.startsWith('/') && origin) url = `${origin}${url}`;
    if (/^https?:\/\//i.test(url) && !isBadImage(url)) {
      images.add(url);
    }
  };

  // 1. Enclosure
  const enclosure = itemObj["enclosure"] as Record<string, unknown> | undefined;
  if (enclosure && enclosure["@_url"]) {
    const type = String(enclosure["@_type"] || "");
    const url = String(enclosure["@_url"]);
    if (type.startsWith("image") || /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url)) {
      addImg(url);
    }
  }

  // 2. Media content / thumbnail
  const mediaNodes = [itemObj["media:content"], itemObj["media:thumbnail"], itemObj["image"]].filter(Boolean);
  for (const node of mediaNodes) {
    if (Array.isArray(node)) {
      for (const sub of node) {
        if (sub && typeof sub === "object") {
          const s = sub as Record<string, unknown>;
          if (s["@_url"]) addImg(String(s["@_url"]));
          else if (s["url"]) addImg(String(s["url"]));
        } else if (typeof sub === "string") {
          addImg(sub);
        }
      }
    } else if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (obj["@_url"]) addImg(String(obj["@_url"]));
      else if (obj["url"]) addImg(String(obj["url"]));
    }
  }

  // 3. Extract all <img> tags from content / description
  if (content) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = imgRegex.exec(content)) !== null) {
      if (m[1]) addImg(m[1]);
    }
  }

  return Array.from(images);
}

function findImageInContent(content: string, itemObj: Record<string, unknown>, origin = ''): string | undefined {
  const all = findAllImagesInContent(content, itemObj, origin);
  return all.length > 0 ? all[0] : undefined;
}

// Helper to decode response with correct charset (utf-8, windows-1251, etc.)
function decodeBufferText(buffer: ArrayBuffer, contentTypeHeader: string | null): string {
  let encoding = 'utf-8';
  if (contentTypeHeader) {
    const match = contentTypeHeader.match(/charset=([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      encoding = match[1].toLowerCase();
    }
  }

  // Pre-inspect first 200 bytes for <?xml encoding="..."?>
  try {
    const preview = new TextDecoder('utf-8').decode(new Uint8Array(buffer.slice(0, 300)));
    const xmlEncMatch = preview.match(/<\?xml[^>]+encoding=["']([a-zA-Z0-9_-]+)["']/i);
    if (xmlEncMatch && xmlEncMatch[1]) {
      encoding = xmlEncMatch[1].toLowerCase();
    }
  } catch (e) {}

  try {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(buffer);
  } catch {
    // Fallback to utf-8
    return new TextDecoder('utf-8').decode(buffer);
  }
}

// Sanitize XML string (escape unescaped ampersands)
function sanitizeXml(xml: string): string {
  return xml.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

// Helper to parse articles from an XML text string (max `limit` items)
function parseXmlFeed(xmlText: string, feedId: string, limit = 10, originalUrl = '') {
  const sanitized = sanitizeXml(xmlText);
  let parsed: Record<string, any> = {};
  try {
    parsed = xmlParser.parse(sanitized);
  } catch {
    parsed = xmlParser.parse(xmlText);
  }

  let feedTitle = "";
  let feedDescription = "";
  let feedLink = "";
  const articles: Array<Record<string, unknown>> = [];

  // Handle RSS 2.0 or 0.9x / RDF
  if (parsed.rss?.channel || parsed["rdf:RDF"] || parsed.channel) {
    const channel = parsed.rss?.channel || parsed["rdf:RDF"]?.channel || parsed.channel || {};
    feedTitle = extractText(channel.title);
    feedDescription = extractText(channel.description);
    feedLink = extractText(channel.link) || originalUrl;

    const itemsRaw = parsed.rss?.channel?.item || parsed["rdf:RDF"]?.item || channel.item || parsed.item || [];
    const items = Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw];

    // Enforce 10 articles per source limit
    const targetItems = items.slice(0, limit);

    for (let i = 0; i < targetItems.length; i++) {
      const it = targetItems[i];
      if (!it) continue;

      const title = extractText(it.title) || "Без названия";
      let link = extractText(it.link) || extractText(it.guid) || "";
      if (typeof it.link === "object" && (it.link as Record<string, unknown>)["@_href"]) {
        link = String((it.link as Record<string, unknown>)["@_href"]);
      }

      const pubDateRaw = extractText(it.pubDate) || extractText(it["dc:date"]) || extractText(it.date);
      let pubDate = pubDateRaw;
      let isoDate = undefined;
      try {
        if (pubDateRaw) {
          const d = new Date(pubDateRaw);
          if (!isNaN(d.getTime())) {
            isoDate = d.toISOString();
            pubDate = d.toLocaleString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        }
      } catch {}

      const rawContent =
        extractText(it["content:encoded"]) ||
        extractText(it.content) ||
        extractText(it.description) ||
        "";
      const contentSnippet = stripHtml(rawContent).slice(0, 300);
      const author = extractText(it["dc:creator"]) || extractText(it.author) || feedTitle || "";
      const feedOrigin = feedLink ? (() => { try { return new URL(feedLink).origin; } catch { return ''; } })() : '';
      const allImgs = findAllImagesInContent(rawContent, it, feedOrigin);
      const imageUrl = allImgs[0] || undefined;

      const categories: string[] = [];
      if (it.category) {
        if (Array.isArray(it.category)) {
          it.category.forEach((c: unknown) => {
            const str = extractText(c);
            if (str) categories.push(str);
          });
        } else {
          const str = extractText(it.category);
          if (str) categories.push(str);
        }
      }

      articles.push({
        id: `${feedId || "feed"}-${i}-${encodeURIComponent(link || title).slice(0, 32)}`,
        feedId: feedId || "feed",
        feedTitle: feedTitle || "RSS Feed",
        title,
        link: link || originalUrl,
        pubDate: pubDate || "Сегодня",
        isoDate: isoDate || new Date().toISOString(),
        author,
        content: rawContent || contentSnippet,
        contentSnippet,
        imageUrl,
        imageUrls: allImgs,
        categories: categories.slice(0, 5),
        isRead: false,
        isStarred: false,
      });
    }
  }
  // Handle Atom Feed
  else if (parsed.feed) {
    const atomFeed = parsed.feed;
    feedTitle = extractText(atomFeed.title);
    feedDescription = extractText(atomFeed.subtitle);
    feedLink = extractText(atomFeed.id) || originalUrl;

    const entriesRaw = atomFeed.entry || [];
    const entries = Array.isArray(entriesRaw) ? entriesRaw : [entriesRaw];
    const targetEntries = entries.slice(0, limit);

    for (let i = 0; i < targetEntries.length; i++) {
      const entry = targetEntries[i];
      if (!entry) continue;

      const title = extractText(entry.title) || "Без названия";
      let link = "";
      if (Array.isArray(entry.link)) {
        const alternate = entry.link.find((l: Record<string, unknown>) => l["@_rel"] === "alternate" || !l["@_rel"]);
        link = alternate ? String(alternate["@_href"]) : String(entry.link[0]?.["@_href"] || "");
      } else if (entry.link && typeof entry.link === "object") {
        link = String((entry.link as Record<string, unknown>)["@_href"] || "");
      } else {
        link = extractText(entry.link) || extractText(entry.id) || "";
      }

      const pubDateRaw = extractText(entry.published) || extractText(entry.updated);
      let pubDate = pubDateRaw;
      let isoDate = undefined;
      try {
        if (pubDateRaw) {
          const d = new Date(pubDateRaw);
          if (!isNaN(d.getTime())) {
            isoDate = d.toISOString();
            pubDate = d.toLocaleString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        }
      } catch {}

      const rawContent = extractText(entry.content) || extractText(entry.summary) || "";
      const contentSnippet = stripHtml(rawContent).slice(0, 300);
      const author = extractText(entry.author?.name) || extractText(entry.author) || feedTitle || "";
      const feedOrigin = feedLink ? (() => { try { return new URL(feedLink).origin; } catch { return ''; } })() : '';
      const allImgs = findAllImagesInContent(rawContent, entry, feedOrigin);
      const imageUrl = allImgs[0] || undefined;

      articles.push({
        id: `${feedId || "atom"}-${i}-${encodeURIComponent(link || title).slice(0, 32)}`,
        feedId: feedId || "atom",
        feedTitle: feedTitle || "Atom Feed",
        title,
        link: link || originalUrl,
        pubDate: pubDate || "Сегодня",
        isoDate: isoDate || new Date().toISOString(),
        author,
        content: rawContent || contentSnippet,
        contentSnippet,
        imageUrl,
        imageUrls: allImgs,
        categories: [],
        isRead: false,
        isStarred: false,
      });
    }
  }

  return {
    feedTitle,
    feedDescription,
    feedLink,
    articles: articles.slice(0, limit),
  };
}

// Scrape articles directly from HTML website if no direct RSS XML returned
function parseHtmlArticles(html: string, siteUrl: string, feedId: string, limit = 10) {
  const articles: Array<Record<string, unknown>> = [];
  const siteOrigin = new URL(siteUrl).origin;

  // Extract site title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const siteTitle = titleMatch ? titleMatch[1].trim() : new URL(siteUrl).hostname;

  // --- Pipeline 1: JSON-LD Extraction ---
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const inner = match.match(/>([\s\S]*?)<\/script>/i);
        if (inner) {
          const data = JSON.parse(inner[1].trim());
          const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : (data.itemListElement ? data.itemListElement : [data]));
          
          for (const item of items) {
            let articleObj = item;
            if (item['@type'] === 'ListItem' && item.item) {
              articleObj = item.item;
            }
            
            if (articleObj['@type'] === 'Article' || articleObj['@type'] === 'NewsArticle' || articleObj['@type'] === 'BlogPosting') {
              if (articles.length >= limit) break;
              
              const title = stripHtml(articleObj.headline || articleObj.name || '');
              let link = typeof articleObj.url === 'string' ? articleObj.url : (articleObj.mainEntityOfPage ? (typeof articleObj.mainEntityOfPage === 'string' ? articleObj.mainEntityOfPage : articleObj.mainEntityOfPage['@id']) : '');
              if (link && link.startsWith('/')) link = `${siteOrigin}${link}`;
              
              const desc = stripHtml(articleObj.description || articleObj.articleBody || '');
              let img = undefined;
              if (articleObj.image) {
                if (typeof articleObj.image === 'string') img = articleObj.image;
                else if (Array.isArray(articleObj.image)) img = typeof articleObj.image[0] === 'string' ? articleObj.image[0] : articleObj.image[0].url;
                else if (articleObj.image.url) img = articleObj.image.url;
              }
              
              if (title && link) {
                articles.push({
                  id: `${feedId || 'html'}-${articles.length}-${encodeURIComponent(link).slice(0, 32)}`,
                  feedId: feedId || 'html',
                  feedTitle: siteTitle,
                  title: title,
                  link: link,
                  pubDate: articleObj.datePublished || 'Свежее',
                  isoDate: articleObj.datePublished ? new Date(articleObj.datePublished).toISOString() : new Date().toISOString(),
                  author: articleObj.author ? (typeof articleObj.author === 'string' ? articleObj.author : articleObj.author.name) : siteTitle,
                  content: desc || title,
                  contentSnippet: desc || title,
                  imageUrl: img,
                  imageUrls: img ? [img] : [],
                  categories: ['Новости'],
                  isRead: false,
                  isStarred: false,
                });
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  // --- Pipeline 2: Regex extraction (fallback) ---
  if (articles.length === 0) {
    const articleRegex = /<(?:article|div|li|section)[^>]*class=["'][^"']*(?:post|item|news|story|card|entry|article)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li|section)>/gi;
    let match;
    let count = 0;

    while ((match = articleRegex.exec(html)) !== null && count < limit) {
      const block = match[1];
      
      const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;

      let href = linkMatch[1];
      if (href.startsWith('/')) href = `${siteOrigin}${href}`;
      if (!href.startsWith('http')) continue;

      const rawHeading = stripHtml(linkMatch[2]);
      if (!rawHeading || rawHeading.length < 8 || rawHeading.length > 250) continue;

      const snippet = stripHtml(block).replace(rawHeading, '').trim().slice(0, 240);
      const blockImgs = findAllImagesInContent(block, {}, siteOrigin);

      articles.push({
        id: `${feedId || 'html'}-${count}-${encodeURIComponent(href).slice(0, 32)}`,
        feedId: feedId || 'html',
        feedTitle: siteTitle,
        title: rawHeading,
        link: href,
        pubDate: 'Свежее',
        isoDate: new Date().toISOString(),
        author: siteTitle,
        content: snippet || rawHeading,
        contentSnippet: snippet || rawHeading,
        imageUrl: blockImgs[0] || undefined,
        imageUrls: blockImgs,
        categories: ['Новости'],
        isRead: false,
        isStarred: false,
      });
      count++;
    }
  }

  // --- Pipeline 3: Fallback <a> tag extraction (long texts) ---
  if (articles.length === 0) {
    const aRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = aRegex.exec(html)) !== null && count < limit) {
      let href = match[1];
      if (href.startsWith('/')) href = `${siteOrigin}${href}`;
      if (!href.startsWith('http')) continue;
      
      const rawHeading = stripHtml(match[2]);
      if (rawHeading.length > 30 && rawHeading.split(' ').length > 4) {
        articles.push({
          id: `${feedId || 'html'}-${count}-${encodeURIComponent(href).slice(0, 32)}`,
          feedId: feedId || 'html',
          feedTitle: siteTitle,
          title: rawHeading,
          link: href,
          pubDate: 'Свежее',
          isoDate: new Date().toISOString(),
          author: siteTitle,
          content: rawHeading,
          contentSnippet: rawHeading,
          imageUrl: undefined,
          imageUrls: [],
          categories: ['Новости'],
          isRead: false,
          isStarred: false,
        });
        count++;
      }
    }
  }

  return { articles: articles.slice(0, limit), feedTitle: siteTitle, feedDescription: 'Парсер веб-страницы', feedLink: siteUrl };
}

// ----------------------------------------------------
// SearchOrchestrator Logic (YouTube, 4PDA, Reddit, Pikabu)
// ----------------------------------------------------
// ----------------------------------------------------
// Adapter Registry
// ----------------------------------------------------
interface SourceAdapter {
  type: string;
  fetch: (params: { url?: string; searchQuery?: string; limit: number; timeoutMs?: number }) => Promise<any[]>;
}

const sourceAdapterRegistry: Record<string, SourceAdapter> = {
  youtube: {
    type: 'youtube',
    fetch: async ({ url, searchQuery, limit = 10, timeoutMs = 12000 }) => {
      const targetUrl = url || `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery || '')}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        if (!(await isUrlSafeForSsrf(targetUrl))) throw new Error('SSRF Blocked: Invalid URL');
        const res = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        const html = await res.text();
        const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          const items = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];
          const articles = [];
          for (const item of items) {
            if (item.videoRenderer && articles.length < limit) {
              articles.push({
                title: item.videoRenderer.title.runs[0].text,
                link: 'https://www.youtube.com/watch?v=' + item.videoRenderer.videoId,
                contentSnippet: item.videoRenderer.descriptionSnippet?.runs?.map((r: any)=>r.text).join('') || '',
                pubDate: item.videoRenderer.publishedTimeText?.simpleText || "Неизвестно",
                isoDate: parseRelativeDateToIso(item.videoRenderer.publishedTimeText?.simpleText || ''),
                guid: item.videoRenderer.videoId,
                imageUrl: item.videoRenderer.thumbnail?.thumbnails?.[0]?.url || '',
                author: item.videoRenderer.ownerText?.runs?.[0]?.text || ''
              });
            }
          }
          return articles;
        }
        return [];
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    }
  },
  
  
  search: {
    type: 'search',
    fetch: async ({ searchQuery, limit = 10, timeoutMs = 12000 }) => {
      if (!searchQuery) return [];
      
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) {
        throw new Error("API ключ SERPER_API_KEY не настроен. Универсальный поиск недоступен.");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ q: searchQuery, num: limit }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Serper API Error: ${res.status} - ${errText}`);
        }
        
        const data = await res.json();
        const articles = [];
        
        if (data.organic && Array.isArray(data.organic)) {
           for (const item of data.organic) {
             let author = item.source || '';
             if (!author && item.link) {
               try {
                 author = new URL(item.link).hostname.replace(/^www\./, '');
               } catch (e) {}
             }
             articles.push({
               title: item.title,
               link: item.link,
               contentSnippet: item.snippet || '',
               pubDate: item.date || "Свежее",
               isoDate: parseRelativeDateToIso(item.date || ''),
               guid: item.link,
               author: author
             });
           }
        }
        return articles;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    }
  },
  reddit: { type: 'reddit', fetch: async () => { throw new Error("SOURCE_NOT_SUPPORTED"); } },
  telegram: { type: 'telegram', fetch: async () => { throw new Error("SOURCE_NOT_SUPPORTED"); } },
  pikabu: { type: 'pikabu', fetch: async () => { throw new Error("SOURCE_NOT_SUPPORTED"); } },
  '4pda': { type: '4pda', fetch: async () => { throw new Error("SOURCE_NOT_SUPPORTED"); } },
  ifixit: { type: 'ifixit', fetch: async () => { throw new Error("SOURCE_NOT_SUPPORTED"); } }
};

// ----------------------------------------------------
// 1. RSS / Atom Feed Fetch & Parse Endpoint
// ----------------------------------------------------






// Helper: Parse relative strings ("2 years ago", "3 дня назад") to approximate ISO Date string
function parseRelativeDateToIso(text: string): string {
  if (!text) return new Date().toISOString();
  const trimmed = text.trim().toLowerCase();
  
  // Try direct parsing first for standard formats
  const parsedMillis = Date.parse(text);
  if (!isNaN(parsedMillis)) {
    return new Date(parsedMillis).toISOString();
  }

  const now = new Date();
  
  // Extract all numbers
  const numMatch = trimmed.match(/(\d+)/);
  const amount = numMatch ? parseInt(numMatch[1], 10) : 1;
  
  if (trimmed.includes('second') || trimmed.includes('секунд')) {
    now.setSeconds(now.getSeconds() - amount);
  } else if (trimmed.includes('minute') || trimmed.includes('минут')) {
    now.setMinutes(now.getMinutes() - amount);
  } else if (trimmed.includes('hour') || trimmed.includes('час')) {
    now.setHours(now.getHours() - amount);
  } else if (trimmed.includes('day') || trimmed.includes('ден') || trimmed.includes('дня') || trimmed.includes('дне')) {
    now.setDate(now.getDate() - amount);
  } else if (trimmed.includes('week') || trimmed.includes('недел')) {
    now.setDate(now.getDate() - (amount * 7));
  } else if (trimmed.includes('month') || trimmed.includes('месяц')) {
    now.setMonth(now.getMonth() - amount);
  } else if (trimmed.includes('year') || trimmed.includes('год') || trimmed.includes('лет')) {
    now.setFullYear(now.getFullYear() - amount);
  } else if (trimmed.includes('yesterday') || trimmed.includes('вчера')) {
    now.setDate(now.getDate() - 1);
  }
  
  return now.toISOString();
}

async function enrichArticlesWithFullText(articles: any[]) {
  const batchSize = 10;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    await Promise.all(batch.map(async (article) => {
      try {
        const currentText = (article.content || article.contentSnippet || '').trim();
        
        // Some RSS feeds put a large snippet or even entire layout fragments in description, 
        // but rarely the actual full article text. We raise the threshold to 5000 to catch these.
        // Also if we suspect it's an RSS snippet (contains '...', 'read more', etc) we can scrape.
        const looksLikeSnippet = currentText.includes('...') || currentText.includes('[...]') || currentText.includes('Читать далее');
        const shouldScrape = (currentText.length < 5000 || looksLikeSnippet) && article.link && /^https?:\/\//i.test(article.link);
        
        if (shouldScrape) {
          if (!article.link.includes('youtube.com/') && !article.link.includes('youtu.be/')) {
            const scraped = await scrapeWebArticle(article.link);
            if (scraped.text && scraped.text.length > currentText.length) {
              article.content = scraped.text;
              if (currentText.length < 50) {
                 article.contentSnippet = scraped.text.slice(0, 300) + '...';
              }
            }
            if (scraped.images && scraped.images.length > 0) {
              article.imageUrls = [...(article.imageUrls || []), ...scraped.images];
              if (!article.imageUrl) article.imageUrl = scraped.images[0];
            }
            
            // Map extraction statuses from previous fix
            article.extractionStatus = scraped.extractionStatus;
            if (scraped.extractionError) {
              article.extractionError = scraped.extractionError;
            }
          }
        }
      } catch (e) {
      }
    }));
  }
  return articles;
}



app.post("/api/rss/fetch", async (req, res) => {
  const { url, feedId, limit: requestedLimit, type, searchQuery, hashtags, keywords, excludeKeywords, keywordMode, category, title } = req.body;
  const limit = typeof requestedLimit === 'number' && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50;

  const cleanType = type ? String(type).toLowerCase().trim() : '';
  let scrapedArticles: any[] = [];
  const adapter = sourceAdapterRegistry[cleanType];
  if (adapter) {
    try {
      scrapedArticles = await adapter.fetch({ url, searchQuery, limit,  });
      await enrichArticlesWithFullText(scrapedArticles);
      const filteredScraped = applyKeywordsFilter(scrapedArticles, keywords, excludeKeywords, keywordMode).slice(0, limit);
      res.json({
        title: title || type || "Поиск",
        description: `Поисковая выдача для ${searchQuery || type}`,
        link: url || "https://google.com",
        itemCount: filteredScraped.length,
        articles: filteredScraped,
      });
      return;
    } catch (scrapeErr: any) {
      addLog("warn", `Скрейпинг источника ${cleanType} завершился ошибкой: ${scrapeErr.message}`);
      res.status(400).json({
        error: `Не удалось загрузить источник ${cleanType}: ${scrapeErr.message}`,
        title: title || type || "Источник",
        description: "Поток не доступен",
        link: url || "",
        itemCount: 0,
        articles: [],
      });
      return;
    }
  }

  if (!url || typeof url !== "string") {
    addLog("error", "Запрос отклонен: Отсутствует или некорректный параметр URL в /api/rss/fetch");
    res.status(400).json({ error: "Missing or invalid feed url" });
    return;
  }

  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  addLog("info", `Запрос на обновление ленты [ID: ${feedId || 'custom'}]: ${cleanUrl}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    addLog("info", `Загрузка сырого контента (HTTP GET): ${cleanUrl}`);
    if (!(await isUrlSafeForSsrf(cleanUrl))) throw new Error('SSRF Blocked: Invalid URL');
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      throw new Error("Размер ответа превышает лимит (5MB)");
    }

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
      throw new Error("Слишком большой ответ от сервера (более 5MB)");
    }

    const rawText = decodeBufferText(arrayBuffer, contentType);
    addLog("info", `Успешный ответ от сервера. Размер данных: ${rawText.length} байт. Content-Type: ${contentType}`);

    // Try parsing as standard RSS / Atom XML
    let parsedResult = { articles: [] as any[], feedTitle: '', feedDescription: '', feedLink: '' };
    
    // Only attempt XML parsing if it looks like XML
    if (rawText.trim().startsWith('<')) {
      try {
        addLog("info", `Пробуем распарсить XML разметку как стандартный RSS/Atom поток...`);
        parsedResult = parseXmlFeed(rawText, feedId || "feed", limit, cleanUrl);
        if (parsedResult.articles.length > 0) {
          addLog("info", `Успешно распарсен стандартный XML поток. Найдено статей: ${parsedResult.articles.length}`);
        }
      } catch (err: any) {
        addLog("warn", `Сбой XML парсинга для ${cleanUrl}: ${err.message || err}`);
        console.warn(`XML parsing failed for ${cleanUrl}, falling back to HTML: ${err}`);
      }
    }

    // If no articles found and page looks like HTML, perform smart discovery/scraping
    if (parsedResult.articles.length === 0 && (contentType?.includes("text/html") || rawText.includes("<html") || rawText.includes("<!DOCTYPE"))) {
      addLog("warn", `XML пуст или отсутствует. Страница определена как HTML. Начинаем поиск альтернативных ссылок и веб-скрейпинг...`);
      
      // 1. Try finding <link rel="alternate" type="application/rss+xml">
      const linkMatch = rawText.match(/<link[^>]+type=["'](application\/rss\+xml|application\/atom\+xml|text\/xml)["'][^>]*href=["']([^"']+)["']/i) ||
                        rawText.match(/<link[^>]+href=["']([^"']+)["'][^>]*type=["'](application\/rss\+xml|application\/atom\+xml|text\/xml)["']/i);
      
      if (linkMatch) {
        const foundFeedHref = linkMatch[1].startsWith('http') ? linkMatch[1] : linkMatch[2];
        let realRssUrl = foundFeedHref;
        if (realRssUrl.startsWith('/')) {
          realRssUrl = `${new URL(cleanUrl).origin}${realRssUrl}`;
        }

        addLog("info", `Обнаружена ссылка на альтернативный RSS поток в HTML заголовке: ${realRssUrl}`);
        try {
          if (!(await isUrlSafeForSsrf(realRssUrl))) throw new Error('SSRF Blocked: Invalid URL');
          const subResp = await fetch(realRssUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (PulseDesk RSS Reader)",
              Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            },
          });
          if (subResp.ok) {
            const subContentLength = subResp.headers.get("content-length");
            if (subContentLength && parseInt(subContentLength, 10) > 5 * 1024 * 1024) {
              throw new Error("Размер альтернативного потока превышает лимит (5MB)");
            }
            const subBuf = await subResp.arrayBuffer();
            if (subBuf.byteLength > 5 * 1024 * 1024) {
              throw new Error("Размер альтернативного потока превышает лимит (5MB)");
            }
            const subText = decodeBufferText(subBuf, subResp.headers.get("content-type"));
            parsedResult = parseXmlFeed(subText, feedId || "feed", limit, realRssUrl);
            addLog("info", `Успешно загружен и спарсен альтернативный RSS поток. Найдено статей: ${parsedResult.articles.length}`);
          }
        } catch (subErr: any) {
          addLog("warn", `Не удалось загрузить альтернативный поток по ссылке ${realRssUrl}: ${subErr.message}`);
        }
      }

      // 2. If still 0 articles, try common RSS paths
      if (parsedResult.articles.length === 0) {
        const origin = new URL(cleanUrl).origin;
        addLog("info", `Альтернативные ссылки не найдены. Проверяем стандартные пути RSS для домена ${origin}...`);
        const probePaths = ['/rss', '/feed', '/rss.xml', '/atom.xml', '/feed.xml', '/rss/all/'];
        for (const p of probePaths) {
          try {
            addLog("info", `Проверка пути: ${origin}${p}`);
            if (!(await isUrlSafeForSsrf(`${origin}${p}`))) throw new Error('SSRF Blocked: Invalid URL');
            const probeResp = await fetch(`${origin}${p}`, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            });
            if (probeResp.ok) {
              const pContentLength = probeResp.headers.get("content-length");
              if (pContentLength && parseInt(pContentLength, 10) > 5 * 1024 * 1024) continue;
              const pBuf = await probeResp.arrayBuffer();
              if (pBuf.byteLength > 5 * 1024 * 1024) continue;
              const pText = decodeBufferText(pBuf, probeResp.headers.get("content-type"));
              const pResult = parseXmlFeed(pText, feedId || "feed", limit, `${origin}${p}`);
              if (pResult.articles.length > 0) {
                parsedResult = pResult;
                addLog("info", `Найден рабочий стандартный RSS поток по пути: ${origin}${p}. Загружено статей: ${pResult.articles.length}`);
                break;
              }
            }
          } catch {}
        }
      }

      // 3. If still 0, scrape articles directly from HTML
      if (parsedResult.articles.length === 0) {
        addLog("warn", `Ни один из стандартных RSS путей не ответил. Запуск прямого семантического парсинга статей из HTML кода...`);
        parsedResult = parseHtmlArticles(rawText, cleanUrl, feedId || "feed", limit);
        addLog("info", `Семантический парсинг HTML завершен. Извлечено статей: ${parsedResult.articles.length}`);
      }
    }

    await enrichArticlesWithFullText(parsedResult.articles);
    const finalArticles = applyKeywordsFilter(parsedResult.articles, keywords, excludeKeywords, keywordMode);
    addLog("info", `Успешно завершено обновление ленты для ${cleanUrl}. Итог: ${finalArticles.length} статей после фильтрации.`);

    res.json({
      title: parsedResult.feedTitle || title || "Источник новостей",
      description: parsedResult.feedDescription || "Информационный поток",
      link: parsedResult.feedLink || cleanUrl,
      itemCount: finalArticles.length,
      articles: finalArticles.slice(0, limit),
    });
  } catch (err: unknown) {
    const error = err as Error;
    addLog("error", `Критическая ошибка при получении ленты ${cleanUrl}: ${error.message}`);
    console.error("RSS fetch error for:", cleanUrl, error.message);
    
    res.status(400).json({ error: `Не удалось загрузить ленту: ${error.message}`,
      title: title || "Источник новостей",
      description: "Поток не доступен",
      link: cleanUrl,
      itemCount: 0,
      articles: [],
    });
  }
});

// ----------------------------------------------------
// 2. Discover RSS Feeds from any Website URL
// ----------------------------------------------------
app.post("/api/rss/discover", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "URL обязателен" });
    return;
  }

  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    if (!(await isUrlSafeForSsrf(targetUrl))) throw new Error('SSRF Blocked: Invalid URL');
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const html = await response.text();
    const discoveredFeeds: Array<{ title: string; url: string; type: string }> = [];

    // Look for link tags
    const linkRegex = /<link[^>]+type=["'](application\/rss\+xml|application\/atom\+xml|text\/xml)["'][^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const tag = match[0];
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      const titleMatch = tag.match(/title=["']([^"']+)["']/i);
      if (hrefMatch && hrefMatch[1]) {
        let feedHref = hrefMatch[1];
        if (feedHref.startsWith("//")) {
          feedHref = `https:${feedHref}`;
        } else if (feedHref.startsWith("/")) {
          const origin = new URL(targetUrl).origin;
          feedHref = `${origin}${feedHref}`;
        }
        discoveredFeeds.push({
          title: titleMatch ? titleMatch[1] : "Найденная лента RSS",
          url: feedHref,
          type: match[1],
        });
      }
    }

    // Try common fallback paths if none found
    if (discoveredFeeds.length === 0) {
      const origin = new URL(targetUrl).origin;
      const commonPaths = ["/rss", "/feed", "/rss.xml", "/atom.xml", "/feed.xml", "/rss/all/"];
      for (const p of commonPaths) {
        discoveredFeeds.push({
          title: `Стандартный путь ${p}`,
          url: `${origin}${p}`,
          type: "application/rss+xml",
        });
      }
    }

    // Extract site title and favicon
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const siteTitle = titleMatch ? titleMatch[1].trim() : new URL(targetUrl).hostname;

    res.json({
      siteUrl: targetUrl,
      siteTitle,
      feeds: discoveredFeeds,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.json({
      siteUrl: targetUrl,
      siteTitle: targetUrl,
      feeds: [
        { title: "Прямой RSS", url: `${targetUrl}/feed`, type: "application/rss+xml" },
        { title: "RSS поток", url: `${targetUrl}/rss`, type: "application/rss+xml" },
      ],
      warning: `Не удалось просканировать сайт (${error.message}), предложены стандартные пути`,
    });
  }
});

// ----------------------------------------------------
// 3. Gemini AI Smart Feed Discovery & Generator
// ----------------------------------------------------
app.post("/api/ai/discover-feeds", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Поисковый запрос обязателен" });
    return;
  }

  try {
    const systemInstruction = `Ты профессиональный куратор новостных RSS-лент и медиа-аналитик.
По запросу пользователя (ключевые слова, темы, названия сайтов или интересы) подбери и сгенерируй от 4 до 8 РЕАЛЬНЫХ, проверенных и работающих RSS/Atom лент.
Если указаны конкретные сайты (например Хабр, The Verge, РБК, OpenAI), найди их точные RSS-ленты.
Если указана общая тема (например "ИИ и нейросети", "Финансы и крипта", "Геймдев"), подбери авторитетные русскоязычные и мировые издания с качественными RSS потоками.

Верни ответ в строго валидном JSON массиве объектов с полями:
- title: название источника (например "Habr: Искусственный Интеллект" или "TechCrunch")
- url: точный рабочий URL RSS/Atom потока (например "https://habr.com/ru/rss/hub/artificial_intelligence/all/?fl=ru", "https://techcrunch.com/feed/")
- siteUrl: основной сайт (например "https://habr.com")
- category: подходящая категория (например "ИИ & Нейросети", "Технологии", "Наука", "Финансы", "Геймдев", "Безопасность")
- description: краткое описание на русском, о чем эта лента
- tags: массив из 3-4 ключевых тегов (например ["AI", "Habr", "Python"])
- confidence: "verified" | "suggested"`;

    const provider = getAiProvider(req);
    const aiModel = req.headers['x-user-ai-model'] ? String(req.headers['x-user-ai-model']) : undefined;
    const response = await provider.generateContent({
      model: aiModel,
      // model: "gemini-3.7-flash", omitted as provider handles it
      prompt: `Подбери качественные RSS потоки по следующему запросу пользователя: "${prompt}". Обязательно укажи реальные URL-адреса потоков.`,
      systemInstruction,
        
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              siteUrl: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              confidence: { type: Type.STRING },
            },
            required: ["title", "url", "category", "description", "tags"]
          }
        }
    });

    const text = response || "[]";
    const feeds = JSON.parse(text);
    res.json({ feeds });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini AI discover error:", error);
    res.status(500).json({ error: `Ошибка генерации подписок ИИ: ${error.message}` });
  }
});

// ----------------------------------------------------
// ----------------------------------------------------
// Helper: Web Article Scraper for Deep Summarization
// ----------------------------------------------------

// ----------------------------------------------------
// Helper: Deterministic Readability Heuristic Extractor
// ----------------------------------------------------
function extractArticleUsingReadabilityHeuristics(html: string): { text: string; score: number } {
  try {
    // 1. Pre-clean noisy and non-content elements
    let doc = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '')
      .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
      .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
      .replace(/<aside[^>]*>([\s\S]*?)<\/aside>/gi, '')
      .replace(/<form[^>]*>([\s\S]*?)<\/form>/gi, '')
      .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '');

    const blocks: Array<{ tag: string; attrs: string; score: number; text: string }> = [];
    
    // Match common block containers
    const tagRegex = /<(div|section|article|p|main|span)([^>]*)>([\s\S]*?)<\/\1>/gi;
    
    let match;
    // Iterate over matches. Though nested tags exist, we can extract all level matching tags 
    // and let the scoring algorithm rank them.
    while ((match = tagRegex.exec(doc)) !== null) {
      const tagName = match[1].toLowerCase();
      const attrs = match[2] || '';
      const inner = match[3] || '';
      const text = stripHtml(inner).trim();
      
      if (text.length < 50) continue; // Skip too short chunks
      
      let score = text.length; // Base score is character count
      
      // Structural weight
      if (tagName === 'article' || tagName === 'main') score += 1500;
      if (tagName === 'p') score += 200;
      if (tagName === 'span') score -= 100;
      
      // Attribute keyword weighting
      const attrsLower = attrs.toLowerCase();
      const positiveKeywords = ['article', 'content', 'post', 'body', 'entry', 'main', 'story', 'text', 'news', 'journal', 'paper', 'detail'];
      const negativeKeywords = ['comment', 'sidebar', 'nav', 'footer', 'ad', 'sponsor', 'share', 'promo', 'header', 'menu', 'widget', 'social', 'meta', 'reply', 'related', 'popular', 'recommend', 'author', 'profile', 'banner', 'popup', 'newsletter', 'tags'];
      
      for (const word of positiveKeywords) {
        if (attrsLower.includes(word)) score += 400;
      }
      for (const word of negativeKeywords) {
        if (attrsLower.includes(word)) score -= 500;
      }
      
      // Punctuation and density weighting (high comma/dot ratio means real readable text)
      const commaCount = (text.split(',').length - 1);
      const dotCount = (text.split('.').length - 1);
      const totalChars = text.length;
      
      if (totalChars > 0) {
        const punctuationRatio = (commaCount + dotCount) / totalChars;
        if (punctuationRatio > 0.015) {
          score += 300; // Boost for prose density
        }
      }
      
      // Russian characters check (specific target optimization for BelkinDESK)
      const russianCharCount = (text.match(/[а-яё]/gi) || []).length;
      if (russianCharCount > 30) {
        score += 200;
      }
      
      blocks.push({
        tag: tagName,
        attrs,
        score,
        text
      });
    }
    
    if (blocks.length === 0) {
      return { text: stripHtml(doc).slice(0, 8000), score: 0 };
    }
    
    // Sort by final score descending
    blocks.sort((a, b) => b.score - a.score);
    
    return { text: blocks[0].text, score: blocks[0].score };
  } catch (e) {
    console.error('Error in readability extractor:', e);
    return { text: '', score: 0 };
  }
}

async function scrapeWebArticle(url: string): Promise<{ text: string; images: string[]; title?: string; extractionStatus?: 'full' | 'partial' | 'failed'; extractionError?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    if (!(await isUrlSafeForSsrf(url))) throw new Error('SSRF Blocked: Invalid OPML URL');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return { text: '', images: [], extractionStatus: 'failed', extractionError: `HTTP status ${response.status}` };

    const buffer = await response.arrayBuffer();
    const html = decodeBufferText(buffer, response.headers.get('content-type'));
    const origin = new URL(url).origin;

    let mainContent = '';
    let title = undefined;
    let images: string[] = [];

    // 1. JSON-LD Extraction
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const inner = match.match(/>([\s\S]*?)<\/script>/i);
          if (inner) {
            const data = JSON.parse(inner[1].trim());
            const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
            for (const item of items) {
              if (item['@type'] === 'Article' || item['@type'] === 'NewsArticle' || item['@type'] === 'BlogPosting') {
                if (item.headline && !title) title = stripHtml(String(item.headline));
                if (item.articleBody) {
                  mainContent = stripHtml(String(item.articleBody));
                } else if (item.text) {
                  mainContent = stripHtml(String(item.text));
                }
                if (item.image) {
                  if (typeof item.image === 'string') images.push(item.image);
                  else if (Array.isArray(item.image)) images.push(...item.image.map(i => typeof i === 'string' ? i : i.url).filter(Boolean));
                  else if (item.image.url) images.push(item.image.url);
                }
                if (mainContent.length > 200) break;
              }
            }
          }
        } catch (e) {}
        if (mainContent.length > 200) break;
      }
    }

    // 2. article/main Extraction
    if (!mainContent || mainContent.length < 200) {
      const articleTagMatch = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
      if (articleTagMatch) {
        mainContent = stripHtml(articleTagMatch[1]);
      }
    }

    // 3. OpenGraph Extraction
    if (!mainContent || mainContent.length < 200) {
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || 
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
      if (ogDescMatch) {
        mainContent = stripHtml(ogDescMatch[1]);
      }
    }
    
    // Fallback for title
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || 
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch) {
        title = stripHtml(ogTitleMatch[1]);
      } else {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? stripHtml(titleMatch[1]) : undefined;
      }
    }

    // Fallback for images
    if (images.length === 0) {
      const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || 
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogImgMatch) {
        let ogImg = ogImgMatch[1];
        if (ogImg.startsWith('/')) ogImg = `${origin}${ogImg}`;
        images.push(ogImg);
      }
    }

    // 4. Specialized Deterministic Heuristic Extraction
    if (!mainContent || mainContent.length < 300) {
      const heuristic = extractArticleUsingReadabilityHeuristics(html);
      if (heuristic.text && heuristic.text.length > mainContent.length) {
        mainContent = heuristic.text;
      }
    }

    // 5. Paragraph Extraction
    if (!mainContent || mainContent.length < 200) {
      const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
      if (pMatches) {
        mainContent = pMatches.map(p => stripHtml(p)).filter(t => t.length > 30).join('\n\n');
      } else {
        mainContent = stripHtml(html).slice(0, 6000);
      }
    }

    const otherImages = findAllImagesInContent(html, {}, origin);
    images = [...new Set([...images, ...otherImages])];

    return { text: mainContent.slice(0, 10000), images, title, extractionStatus: mainContent.length > 200 ? 'full' : 'partial' };
  } catch {
    return { text: '', images: [], extractionStatus: 'failed', extractionError: e instanceof Error ? e.message : String(e) };
  }
}

// ----------------------------------------------------
// 4. Batch Gemini AI News Processor & Formatter (Single-line, 3-lines, Full Compressed, Terms, Russian Translation)
// ----------------------------------------------------
app.post("/api/ai/process-articles", async (req, res) => {
  const { articles, customPrompt } = req.body;
  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    res.status(400).json({ error: "Список статей обязателен" });
    return;
  }

  const itemsToProcess = articles.slice(0, 15);

  try {
    const formattedList = itemsToProcess.map((a: any, idx: number) => {
      return `[ARTICLE_${idx}] ID: ${a.id}\nSource: ${a.feedTitle || 'News'}\nOriginal Title: ${a.title}\nContent snippet: ${(a.content || a.contentSnippet || '').slice(0, 1200)}\nLink: ${a.link || ''}`;
    }).join('\n\n---\n\n');

    const systemInstruction = `Ты старший научный и технологический редактор и переводчик для информационной системы BelkinDESK.
Твоя задача — обработать входящие новости (на русском или иностранных языках) строго по следующим правилам для каждой статьи:
1. "titleRu" — Чистый, грамотный заголовок на русском языке. Он ДОЛЖЕН в точности соответствовать оригинальному названию статьи или видеоролика (без добавления каких-либо искусственных префиксов, контекстов запроса, метатегов или поисковых фраз вроде 'Контекст: ...' или 'Реболлинг...'). Только оригинальный чистый перевод названия!
2. "summaryOneLine" — Ультра-краткая суть ровно в 1 ёмкое предложение на русском языке, которое содержит краткую суть о чем статья или ролик (краткая суть).
3. "summaryThreeLines" — Сжатое информативное изложение в 2-3 предложения на русском языке, содержащее краткую суть о чем статья или ролик (краткая суть).
4. "detailedContent" — Полный подробный пересказ (recount) статьи или видеоролика на русском языке. Он должен быть очень информативным, длинным (минимум 3-4 подробных абзаца с использованием clean HTML: p, ul, li, strong) и в деталях передавать содержание статьи, с обязательным и явным указанием абсолютно всех ключевых терминов, точных моделей устройств, электронных компонентов, микросхем или инновационных технологий, описываемых в статье или ролике. Не ужимай слишком сильно, давай детальный, качественный технический/клинический разбор для специалистов!
5. "keyTerms" — Массив из 3-6 ключевых понятий / терминов / маркировок / моделей устройств на русском.
6. "sentiment" — 'positive' | 'neutral' | 'negative' | 'analytical'.

${customPrompt ? `ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ ПОЛЬЗОВАТЕЛЯ ИЗ НАСТРОЕК:\n${customPrompt}` : 'Фокусируйся на фактах, детальном изложении, инженерной/медицинской точности и полном раскрытии терминов и моделей.'}`;

    const provider = getAiProvider(req);
    const aiModel = req.headers['x-user-ai-model'] ? String(req.headers['x-user-ai-model']) : undefined;
    const response = await provider.generateContent({
      model: aiModel,
      prompt: `Список статей для обработки и форматирования:\n\n${formattedList}`,
      systemInstruction,
        
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            processedArticles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  titleRu: { type: Type.STRING },
                  summaryOneLine: { type: Type.STRING },
                  summaryThreeLines: { type: Type.STRING },
                  detailedContent: { type: Type.STRING },
                  keyTerms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  sentiment: { type: Type.STRING },
                },
                required: ["id", "titleRu", "summaryOneLine", "summaryThreeLines", "detailedContent", "keyTerms"],
              },
            },
          },
          required: ["processedArticles"]
        }
    });

    const parsedJson = JSON.parse(response || "{}");
    const processedMap = new Map<string, any>();
    if (parsedJson.processedArticles && Array.isArray(parsedJson.processedArticles)) {
      parsedJson.processedArticles.forEach((p: any) => {
        if (p.id) processedMap.set(p.id, p);
      });
    }

    const merged = itemsToProcess.map((art: any, idx: number) => {
      const proc = processedMap.get(art.id) || processedMap.get(`ARTICLE_${idx}`);
      if (proc) {
        return {
          ...art,
          ai: {
            titleRu: proc.titleRu || art.title,
            summaryOneLine: proc.summaryOneLine || art.contentSnippet,
            summaryThreeLines: proc.summaryThreeLines || art.contentSnippet,
            detailedContent: proc.detailedContent || art.contentSnippet,
            keyTerms: proc.keyTerms || [],
            sentiment: proc.sentiment || 'analytical',
          }
        };
      }
      return {
        ...art,
        titleRu: art.titleRu || art.title,
        summaryOneLine: art.summaryOneLine || art.contentSnippet,
        summaryThreeLines: art.summaryThreeLines || art.contentSnippet,
        detailedContent: art.detailedContent || art.contentSnippet,
      };
    });

    res.json({ articles: merged });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini batch process articles error:", error);
    if (error.message.includes('Лимит') || error.message.includes('429')) {
      res.status(429).json({ error: error.message });
      return;
    }
    const fallback = itemsToProcess.map((art: any) => ({
      ...art,
      titleRu: art.titleRu || art.title,
      summaryOneLine: art.summaryOneLine || (art.contentSnippet ? art.contentSnippet.slice(0, 120) : art.title),
      summaryThreeLines: art.summaryThreeLines || (art.contentSnippet ? art.contentSnippet.slice(0, 280) : art.title),
      detailedContent: art.detailedContent || art.content || art.contentSnippet,
      keyTerms: art.keyTerms || art.categories || [],
    }));
    res.json({ articles: fallback });
  }
});

// ----------------------------------------------------
// 5. Single Article Deep Summarizer & Image Extractor (Modal View)
// ----------------------------------------------------
app.post("/api/ai/summarize-article", async (req, res) => {
  const { article, customPrompt } = req.body;
  if (!article) {
    res.status(400).json({ error: "Объект статьи обязателен" });
    return;
  }

  try {
    let articleText = (article.content || article.contentSnippet || '').trim();
    let allImages = Array.isArray(article.imageUrls) ? [...article.imageUrls] : (article.imageUrl ? [article.imageUrl] : []);

    // If text is short (< 5000 chars) and link is valid web page, scrape full web page
    const looksLikeSnippet = articleText.includes('...') || articleText.includes('[...]') || articleText.includes('Читать далее');
    if ((articleText.length < 5000 || looksLikeSnippet) && article.link && /^https?:\/\//i.test(article.link)) {
      const scraped = await scrapeWebArticle(article.link);
      if (scraped.text && scraped.text.length > articleText.length) {
        articleText = scraped.text;
      }
      if (scraped.images && scraped.images.length > 0) {
        scraped.images.forEach(img => {
          if (!allImages.includes(img)) allImages.push(img);
        });
      }
      // Log extraction status
      console.log(`Article ${article.id} extraction: ${scraped.extractionStatus}`, scraped.extractionError ? scraped.extractionError : '');

    }

    const systemInstruction = `Ты старший эксперт-аналитик, технологический редактор и профессиональный переводчик для BelkinDESK.
Твоя задача — составить качественное, связное и подробное содержание публикации на чистом русском языке БЕЗ ВОДЫ И ШАБЛОНОВ.

ПРАВИЛА:
1. "titleRu": Заголовок карточки должен в точности соответствовать оригинальному названию статьи или видеоролика (без добавления каких-либо искусственных префиксов, метаданных, контекстов или поисковых запросов). Только чистый оригинальный перевод названия статьи/ролика на русский язык!
2. "content": Полный подробный пересказ (recount) статьи или видеоролика на русском языке. Это должен быть связный, детальный, длинный разбор (минимум 3-4 содержательных абзаца с использованием HTML-тегов p, ul, li, strong) с обязательным указанием ВСЕХ ключевых терминов, конкретных моделей устройств, электронных компонентов, микросхем, деталей или современных технологий, описываемых в материале. Избегай сокращений важных технических или клинических подробностей — читателю важна глубина!
3. "summaryOneLine": Краткая суть статьи или ролика ровно в 1 ёмкое предложение на русском языке (краткая суть).
4. "keyTerms": Массив из 3-6 ключевых терминов/понятий/маркировок/моделей.
5. "estimatedReadMinutes": Число минут чтения оригинала.

${customPrompt && customPrompt.trim().length > 5 ? `ОБЯЗАТЕЛЬНО СЛЕДУЙ ПРОМПТУ ОБРАБОТКИ ИЗ НАСТРОЕК ПОЛЬЗОВАТЕЛЯ:\n${customPrompt.trim()}` : 'Исключи всю воду, вводные фразы, кликбейт и рекламные клише. Сохрани все важные термины, формулы, измерения и числа.'}`;

    const provider = getAiProvider(req);
    const aiModel = req.headers['x-user-ai-model'] ? String(req.headers['x-user-ai-model']) : undefined;
    const response = await provider.generateContent({
      model: aiModel,
      prompt: `Заголовок статьи: ${article.title}\nИсточник: ${article.feedTitle || 'Источник'}\nСсылка: ${article.link}\n\nТекст публикации:\n${articleText.slice(0, 10000)}`,
      systemInstruction,
        
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titleRu: { type: Type.STRING },
            content: { type: Type.STRING },
            summaryOneLine: { type: Type.STRING },
            keyTerms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            estimatedReadMinutes: { type: Type.INTEGER },
          },
          required: ["titleRu", "content", "summaryOneLine", "keyTerms"]
        }
    });

    const data = JSON.parse(response || "{}");
    const formattedContent = data.content || article.contentSnippet || '';

    res.json({
      titleRu: data.titleRu || article.titleRu || article.title,
      content: formattedContent,
      main: formattedContent, // backward compatibility
      summaryOneLine: data.summaryOneLine || article.summaryOneLine,
      keyTerms: data.keyTerms || [],
      estimatedReadMinutes: data.estimatedReadMinutes || 2,
      images: allImages,
      link: article.link,
      feedTitle: article.feedTitle,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini summarize article error:", error);
    if (error.message.includes('Лимит') || error.message.includes('429') || error.message.includes('OpenAI')) {
      res.status(429).json({ error: error.message });
      return;
    }
    res.json({
      titleRu: article.titleRu || article.title,
      content: article.detailedContent || article.summaryOneLine || article.contentSnippet || 'Публикация содержит актуальные данные и факты.',
      main: article.detailedContent || article.summaryOneLine || article.contentSnippet || 'Публикация содержит актуальные данные и факты.',
      summaryOneLine: article.summaryOneLine || article.contentSnippet,
      keyTerms: article.keyTerms || article.categories || [],
      estimatedReadMinutes: 2,
      images: article.imageUrls || (article.imageUrl ? [article.imageUrl] : []),
      link: article.link,
      feedTitle: article.feedTitle,
    });
  }
});

// ----------------------------------------------------
// 6. Gemini AI Article Summarization (Custom Prompt / Multi-Archetype)
// ----------------------------------------------------
app.post("/api/ai/summarize", async (req, res) => {
  const { title, content, mode = "engineer", customPrompt } = req.body;
  if (!content && !title) {
    res.status(400).json({ error: "Текст или заголовок обязателен" });
    return;
  }

  try {
    const defaultInstruction = `Ты AI-редактор и технический переводчик для BelkinDESK.
Твоя задача — составить грамотное, качественное единое содержание материала на русском языке без воды и без шаблонного дробления на части.
Сохраняй важные факты, цифры, маркировки компонентов, параметры и практическую пользу.`;

    const systemInstruction = customPrompt && customPrompt.trim().length > 10
      ? `${customPrompt.trim()}\n\nВерни структурированный ответ в JSON с полями:
- content: связный единый текст выжимки статьи на русском языке
- summaryOneLine: 1 емкое предложение сути
- estimatedReadMinutes: число минут чтения оригинала`
      : defaultInstruction;

    const provider = getAiProvider(req);
    const aiModel = req.headers['x-user-ai-model'] ? String(req.headers['x-user-ai-model']) : undefined;
    const response = await provider.generateContent({
      model: aiModel,
      prompt: `Заголовок материала: ${title || "Без заголовка"}\n\nТекст/сниппет публикации:\n${content.slice(0, 8000)}\n\nРежим: ${mode}`,
      systemInstruction,
        
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            summaryOneLine: { type: Type.STRING },
            estimatedReadMinutes: { type: Type.INTEGER },
            sentiment: { type: Type.STRING },
          },
          required: ["content"],
      },
    });

    const text = response || "{}";
    const data = JSON.parse(text);
    const resultText = data.content || data.main || content;

    res.json({
      summary: resultText,
      content: resultText,
      main: resultText,
      summaryOneLine: data.summaryOneLine || '',
      estimatedReadMinutes: data.estimatedReadMinutes || 3,
      sentiment: data.sentiment || "analytical",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini summarize error:", error);
    res.json({
      summary: `Публикация «${title}» содержит актуальные практические данные и рекомендации для специалистов.`,
      content: `Публикация «${title}» содержит актуальные практические данные и рекомендации для специалистов.`,
      main: `Публикация «${title}» содержит актуальные практические данные и рекомендации для специалистов.`,
      estimatedReadMinutes: 2,
      sentiment: "analytical",
    });
  }
});

// ----------------------------------------------------
// 5. Gemini AI Daily Digest / Executive Briefing
// ----------------------------------------------------
app.post("/api/ai/digest", async (req, res) => {
  const { articles, category } = req.body;
  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    res.status(400).json({ error: "Не переданы статьи для дайджеста" });
    return;
  }

  try {
    const articlesList = articles.slice(0, 15).map((a: Record<string, string>, i: number) => {
      return `[${i + 1}] Источник: ${a.feedTitle || "Новость"} | Заголовок: ${a.title}\nСуть: ${a.contentSnippet || a.content || ""}\nСсылка: ${a.link || ""}`;
    }).join("\n\n");

    const systemInstruction = `Ты главный редактор и персональный информационный ассистент.
Твоя задача — составить утренний/вечерний дайджест главных новостей на русском языке по подпискам пользователя.
Сгруппируй важнейшие события, выдели тренды и составь короткие понятные выводы.`;

    const provider = getAiProvider(req);
    const aiModel = req.headers['x-user-ai-model'] ? String(req.headers['x-user-ai-model']) : undefined;
    const response = await provider.generateContent({
      model: aiModel,
      prompt: `Категория: ${category || "Все подписки"}\n\nСвежие публикации:\n${articlesList}`,
      systemInstruction,
        
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            topStories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  feedTitle: { type: Type.STRING },
                  link: { type: Type.STRING },
                  category: { type: Type.STRING },
                  impact: { type: Type.STRING },
                },
                required: ["title", "summary", "feedTitle", "impact"],
              },
            },
            overallTrends: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["title", "topStories", "overallTrends", "keyTakeaways"]
        }
    });

    const text = response || "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini digest error:", error);
    res.status(500).json({ error: `Ошибка генерации дайджеста: ${error.message}` });
  }
});

// ----------------------------------------------------
// 6. Gemini AI Ask My Feeds
// ----------------------------------------------------
app.post("/api/ai/ask-feeds", async (req, res) => {
  const { query, articles } = req.body;
  if (!query) {
    res.status(400).json({ error: "Вопрос обязателен" });
    return;
  }

  try {
    const context = (articles || []).slice(0, 12).map((a: Record<string, string>, i: number) => {
      return `[Статья ${i + 1}] "${a.title}" (${a.feedTitle})\n${a.contentSnippet || a.content || ""}\nСсылка: ${a.link}`;
    }).join("\n\n");

    const systemInstruction = `Ты умный ассистент по персональным новостным лентам пользователя.
Ответь на вопрос пользователя, опираясь на информацию из его свежих статей.
Приводи конкретные факты, источники и ссылки. Если информации недостаточно в лентах, дай общий экспертный ответ и поясни это.`;

    const provider = getAiProvider(req);
    const aiModel = req.headers['x-user-ai-model'] ? String(req.headers['x-user-ai-model']) : undefined;
    const response = await provider.generateContent({
      model: aiModel,
      prompt: `Вопрос пользователя: "${query}"\n\nКонтекст из лент:\n${context}`,
      systemInstruction,
    });

    res.json({ answer: response });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini ask feeds error:", error);
    res.status(500).json({ error: `Ошибка ответа ассистента: ${error.message}` });
  }
});

// ----------------------------------------------------
// 7. Multi-User Accounts & Workspace Profile Sync
// ----------------------------------------------------
app.get("/api/users", (req, res) => {
  const users = loadUsersData();
  const profiles = Object.values(users).map((u: Record<string, unknown>) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    avatar: u.avatar,
    createdAt: u.createdAt,
    feedsCount: Array.isArray(u.feeds) ? u.feeds.length : 0,
  }));
  res.json({ profiles });
});

app.get("/api/users/:id", (req, res) => {
  const users = loadUsersData();
  const user = users[req.params.id];
  if (!user) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  res.json({ user });
});

app.post("/api/users/save", (req, res) => {
  const { user } = req.body;
  if (!user || !user.id) {
    res.status(400).json({ error: "Некорректные данные пользователя" });
    return;
  }

  const users = loadUsersData();
  users[user.id] = {
    ...users[user.id],
    ...user,
    updatedAt: new Date().toISOString(),
  };
  saveUsersData(users);

  res.json({ success: true, user: users[user.id] });
});

// ----------------------------------------------------
// 8. OPML Export / Import Helper
// ----------------------------------------------------
app.post("/api/opml/export", (req, res) => {
  const { feeds, title = "PulseDesk Subscriptions" } = req.body;
  if (!feeds || !Array.isArray(feeds)) {
    res.status(400).json({ error: "Список лент обязателен" });
    return;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<opml version="2.0">\n`;
  xml += `  <head>\n    <title>${title}</title>\n    <dateCreated>${new Date().toUTCString()}</dateCreated>\n  </head>\n`;
  xml += `  <body>\n`;

  // Group by category
  const categories: Record<string, Array<{ title: string; url: string; siteUrl?: string }>> = {};
  for (const f of feeds) {
    const cat = f.category || "Общие";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(f);
  }

  for (const [cat, items] of Object.entries(categories)) {
    xml += `    <outline text="${cat}" title="${cat}">\n`;
    for (const it of items) {
      xml += `      <outline type="rss" text="${it.title.replace(/"/g, "&quot;")}" title="${it.title.replace(/"/g, "&quot;")}" xmlUrl="${it.url.replace(/"/g, "&quot;")}" htmlUrl="${(it.siteUrl || "").replace(/"/g, "&quot;")}"/>\n`;
    }
    xml += `    </outline>\n`;
  }

  xml += `  </body>\n</opml>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="subscriptions.opml"');
  res.send(xml);
});

// ----------------------------------------------------
// Admin Logs API Routes
// ----------------------------------------------------
app.get("/api/admin/logs", (req, res) => {
  res.json({ logs: debugLogs });
});

app.post("/api/admin/logs", (req, res) => {
  const { type, message, details } = req.body;
  addLog(type || "info", message || "", details);
  res.json({ success: true, logs: debugLogs });
});

app.post("/api/admin/logs/clear", (req, res) => {
  debugLogs.length = 0;
  addLog("info", "Журнал отладки успешно очищен администратором.");
  res.json({ success: true, logs: debugLogs });
});

// ----------------------------------------------------
// Start Vite dev server or static files
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PulseDesk Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
