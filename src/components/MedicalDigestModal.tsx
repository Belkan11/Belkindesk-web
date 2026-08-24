import React, { useState, useEffect } from 'react';
import {
  Star,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Article, AppArchetypeStyle } from '../types';
import { aiSummarizeArticleDeep } from '../utils/feedApi';

interface DigestContentData {
  title: string;
  content: string;
  summaryOneLine?: string;
  estimatedReadMinutes?: number;
}

interface MedicalDigestModalProps {
  article: Article | null;
  onClose: () => void;
  onToggleStar: (articleId: string) => void;
  customPrompt?: string;
  enableAutoAiProcessing?: boolean;
  appStyle?: AppArchetypeStyle;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const MedicalDigestModal: React.FC<MedicalDigestModalProps> = ({
  article,
  onClose,
  onToggleStar,
  customPrompt,
  enableAutoAiProcessing = false,
  appStyle = 'classic',
  onPlaySound,
}) => {
  const isModern = appStyle === 'modern';
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0); // -1 to +2
  const [isGenerating, setIsGenerating] = useState(false);
  const [digest, setDigest] = useState<DigestContentData | null>(null);
  const [keyTerms, setKeyTerms] = useState<string[]>([]);
  const [articleImages, setArticleImages] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Image Lightbox / Zoom State
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Escape key listener
  useEffect(() => {
    if (!article) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedImageIdx !== null) {
          setSelectedImageIdx(null);
          setZoomLevel(1);
          setPanPosition({ x: 0, y: 0 });
        } else {
          onClose();
        }
        onPlaySound?.('click');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [article, onClose, onPlaySound, selectedImageIdx]);

  useEffect(() => {
    if (!article) return;

    // Collect pre-existing images
    const imgs: string[] = [];
    if (Array.isArray(article.imageUrls)) {
      article.imageUrls.forEach((im) => {
        if (im && !imgs.includes(im)) imgs.push(im);
      });
    }
    if (article.imageUrl && !imgs.includes(article.imageUrl)) {
      imgs.push(article.imageUrl);
    }
    setArticleImages(imgs);

    // Initial terms
    if (article.keyTerms && article.keyTerms.length > 0) {
      setKeyTerms(article.keyTerms);
    } else if (article.categories && article.categories.length > 0) {
      setKeyTerms(article.categories);
    }

    if (article.detailedContent) {
      setDigest({
        title: article.ai?.titleRu || article.title,
        content: article.ai?.detailedContent || article.contentSnippet || article.content || "Содержание не адаптировано.",
        summaryOneLine: article.ai?.summaryOneLine,
        estimatedReadMinutes: 2,
      });
    } else {
      // Fast fallback to local snippet so user can read instantly
      setDigest({
        title: article.ai?.titleRu || article.title,
        content: article.contentSnippet || article.content || 'Содержание не адаптировано.',
        summaryOneLine: article.ai?.summaryOneLine || "",
        estimatedReadMinutes: 1,
      });
      
    }
  }, [article, customPrompt, enableAutoAiProcessing]);

  const generateDeepDigest = async (art: Article) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const data = await aiSummarizeArticleDeep(art, customPrompt);
      if (data) {
        const textContent = data.content || data.main || art.ai?.detailedContent || art.contentSnippet || art.content || '';
        setDigest({
          title: data.titleRu || art.ai?.titleRu || art.title,
          content: textContent,
          summaryOneLine: data.summaryOneLine || art.ai?.summaryOneLine,
          estimatedReadMinutes: data.estimatedReadMinutes || 2,
        });
        if (Array.isArray(data.keyTerms) && data.keyTerms.length > 0) {
          setKeyTerms(data.keyTerms);
        }
        if (Array.isArray(data.images) && data.images.length > 0) {
          setArticleImages((prev) => {
            const combined = [...prev];
            data.images.forEach((img: string) => {
              if (img && !combined.includes(img)) combined.push(img);
            });
            return combined;
          });
        }
      }
    } catch (err: any) {
      alert(err.message || "Ошибка AI обработки");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!article) return null;

  const handleCopy = () => {
    if (!digest) return;
    const text = `BelkinDESK — Содержание публикации:\n${digest.title || article.title}\n\n${digest.content}\n\nКлючевые термины: ${keyTerms.join(', ')}\nИсточник: ${article.link}`;
    navigator.clipboard?.writeText?.(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onPlaySound?.('click');
  };

  const getFontSizeClass = () => {
    switch (fontSizeOffset) {
      case -1:
        return 'text-xs sm:text-[13px] leading-relaxed';
      case 1:
        return 'text-sm sm:text-base leading-relaxed';
      case 2:
        return 'text-base sm:text-lg leading-relaxed';
      default:
        return 'text-[13px] sm:text-sm leading-relaxed';
    }
  };

  // Zoom handlers for image modal
  const handleZoomIn = () => setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150 select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && selectedImageIdx === null) {
          onClose();
          onPlaySound?.('click');
        }
      }}
    >
      <div
        id="modal-medical-digest"
        className={`w-full max-w-3xl h-[700px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs relative my-auto transition-all ${
          isModern
            ? 'bg-[#0a1020]/90 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
            : 'bg-[#11141b] border border-slate-700/60'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Minimal Header Bar */}
        <div className={`h-11 px-4 flex items-center justify-between shrink-0 select-none border-b ${
          isModern ? 'bg-[#0d172a]/90 border-cyan-500/30 text-cyan-300' : 'bg-[#161a23] border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5 text-slate-300 truncate">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isModern ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'bg-[#ffcc00]'}`}></span>
            <span className={`font-bold tracking-wide font-sans text-[13px] ${isModern ? 'text-cyan-200' : 'text-slate-200'}`}>
              BELKIN DESK
            </span>
            <span className="text-slate-600 font-normal">/</span>
            <span className="text-slate-400 font-medium tracking-normal text-xs">
              Выжимка статьи
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Star Toggle */}
            <button
              onClick={() => {
                onToggleStar(article.id);
                onPlaySound?.('star');
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                article.isStarred
                  ? 'text-[#ffcc00] bg-[#ffcc00]/10 hover:bg-[#ffcc00]/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={article.isStarred ? 'В избранном' : 'Добавить в избранное'}
            >
              <Star className={`w-4 h-4 ${article.isStarred ? 'fill-[#ffcc00]' : ''}`} />
            </button>

            <span className="hidden sm:inline text-[10px] text-slate-500 font-mono bg-[#1b2029] px-2 py-0.5 rounded border border-slate-800">
              Esc
            </span>

            {/* Close Button */}
            <button
              id="btn-close-digest"
              onClick={() => {
                onClose();
                onPlaySound?.('click');
              }}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-red-500/20 rounded-lg transition cursor-pointer flex items-center justify-center"
              title="Закрыть окно (Esc)"
              aria-label="Закрыть окно"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Article Title & Source Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-[#ffcc00] font-mono font-medium bg-[#1e232f] px-2.5 py-0.5 rounded text-[11px]">
                {article.feedTitle || 'Источник'}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">{article.pubDate}</span>
            </div>

            <h3 className="text-slate-100 font-sans font-bold text-base sm:text-lg leading-snug">
              {digest?.title || article.titleRu || article.title}
            </h3>
          </div>

          {/* Controls Bar: Font Scaling + AI Update + Copy */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 pb-1 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Шрифт:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFontSizeOffset(Math.max(-1, fontSizeOffset - 1))}
                  className="px-2 py-0.5 rounded bg-[#1c222c] hover:bg-[#283240] text-slate-300 font-bold cursor-pointer"
                >
                  A-
                </button>
                <span className="text-[#ffcc00] font-mono text-[11px] w-10 text-center">
                  {fontSizeOffset === 0 ? '100%' : fontSizeOffset > 0 ? `+${fontSizeOffset * 20}%` : `-${Math.abs(fontSizeOffset) * 20}%`}
                </span>
                <button
                  onClick={() => setFontSizeOffset(Math.min(2, fontSizeOffset + 1))}
                  className="px-2 py-0.5 rounded bg-[#1c222c] hover:bg-[#283240] text-slate-300 font-bold cursor-pointer"
                >
                  A+
                </button>
              </div>
            </div>

            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateDeepDigest(article)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#283240] hover:bg-[#324054] text-slate-200 transition font-sans cursor-pointer disabled:opacity-50"
                title="Адаптировать с помощью AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
                <span className="font-medium">AI обработать</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181d27] hover:bg-[#232b38] text-slate-300 transition cursor-pointer text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>

              <button
                onClick={() => generateDeepDigest(article)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#252013] hover:bg-[#382f1b] text-[#ffcc00] border border-[#ffcc00]/30 transition cursor-pointer text-xs font-medium"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Обработка...' : 'Обновить AI'}</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* IMAGE GALLERY WITH CLICK-TO-ZOOM LIGHTBOX                      */}
          {/* ============================================================== */}
          {articleImages.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ImageIcon className="w-3.5 h-3.5 text-[#ffcc00]" />
                  <span>Иллюстрации ({articleImages.length}):</span>
                </span>
                <span className="text-[11px] text-slate-500">Нажмите на фото для просмотра</span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {articleImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedImageIdx(idx);
                      setZoomLevel(1);
                      setPanPosition({ x: 0, y: 0 });
                      onPlaySound?.('click');
                    }}
                    className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-[#141822] border border-slate-800 overflow-hidden shrink-0 cursor-zoom-in hover:border-[#ffcc00]/70 transition"
                  >
                    <img
                      src={imgUrl}
                      alt={`Иллюстрация ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5 text-[#ffcc00]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CLEAN UNIFIED ARTICLE CONTENT (FEWER FRAMES & BORDERS)         */}
          {/* ============================================================== */}
          <div className="pt-2 pb-2">
            {isGenerating ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <Sparkles className="w-6 h-6 text-[#ffcc00] animate-spin" />
                <span className="font-sans text-xs text-slate-400">
                  Формирование единого связного содержания по промпту...
                </span>
              </div>
            ) : digest ? (
              <div className={`space-y-4 font-sans ${getFontSizeClass()}`}>
                {/* Unified Body Content */}
                <div className="text-slate-200 whitespace-pre-line leading-relaxed tracking-normal font-sans">
                  {digest.content}
                </div>

                {/* Key Terms */}
                {keyTerms.length > 0 && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-2">
                    <div className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      Ключевые понятия и маркировки:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {keyTerms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded bg-[#1c222c] text-slate-300 text-xs font-mono"
                        >
                          #{term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 font-sans text-xs">
                Не удалось загрузить выжимку.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-500 font-mono">
              Источник: {article.feedTitle || 'Первоисточник'}
            </span>

            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a202c] hover:bg-[#252e3e] text-slate-200 transition cursor-pointer text-xs font-medium"
            >
              <span>Оригинал статьи</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FULL-SCREEN ZOOMABLE LIGHTBOX OVERLAY                           */}
      {/* ============================================================== */}
      {selectedImageIdx !== null && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onMouseDown={() => {
            setSelectedImageIdx(null);
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
          }}
        >
          {/* Lightbox Controls */}
          <div
            className="absolute top-4 right-4 flex items-center gap-2 z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="bg-[#12161f] border border-slate-700 px-3 py-1 rounded-full flex items-center gap-2 text-slate-300 text-xs font-mono">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:text-white cursor-pointer"
                title="Уменьшить"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span>{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:text-white cursor-pointer"
                title="Увеличить"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 hover:text-white cursor-pointer ml-1"
                title="Сбросить масштаб"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedImageIdx(null);
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Prev / Next Image Navigation */}
          {articleImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIdx((prev) =>
                    prev !== null ? (prev - 1 + articleImages.length) % articleImages.length : 0
                  );
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer transition z-10"
                title="Предыдущее фото"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIdx((prev) =>
                    prev !== null ? (prev + 1) % articleImages.length : 0
                  );
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer transition z-10"
                title="Следующее фото"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Main Zoomable Image Canvas */}
          <div
            className="max-w-full max-h-[85vh] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDragging(true);
              setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
            }}
            onMouseMove={(e) => {
              if (!isDragging) return;
              setPanPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
              });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }}
          >
            <img
              src={articleImages[selectedImageIdx]}
              alt={`Увеличенная иллюстрация ${selectedImageIdx + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-[80vh] max-w-[90vw] object-contain transition-transform duration-75 select-none rounded shadow-2xl"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
              }}
              draggable={false}
            />
          </div>

          <div className="absolute bottom-4 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full">
            Иллюстрация {selectedImageIdx + 1} из {articleImages.length}
          </div>
        </div>
      )}
    </div>
  );
};
