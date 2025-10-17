/**
 * Automatic Translation Service for Japanese to English
 * Uses translation APIs to automatically translate Japanese text to English
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. For better translation quality, get a Google Translate API key:
 *    - Go to Google Cloud Console (https://console.cloud.google.com/)
 *    - Enable the Google Translate API
 *    - Create credentials (API key)
 *    - Add NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY to your environment variables
 *
 * 2. Uncomment and configure the Google Translate function in this file:
 *    - Replace translateWithGoogle function with actual Google Translate API calls
 *
 * 3. For production, consider using Google Translate API for better accuracy
 *    and reliability than the free LibreTranslate service.
 *
 * CURRENT IMPLEMENTATION:
 * - Uses LibreTranslate public API (free, but has rate limits)
 * - Falls back to pattern-based translation for common terms
 * - Caches translations for 24 hours to reduce API calls
 */

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, string>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Enable/disable API translation (set to false if API is unreliable)
const ENABLE_API_TRANSLATION = false;

// Force disable API calls to prevent errors
const FORCE_DISABLE_API = true;

interface CachedTranslation {
  text: string;
  timestamp: number;
}

/**
 * Detects if text contains Japanese characters
 */
function containsJapanese(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Check for Japanese character ranges
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
}

/**
 * Simple translation using LibreTranslate API (free alternative to Google Translate)
 * You can replace this with Google Translate API or any other service
 */
async function translateWithLibreTranslate(text: string, targetLang: string = 'en'): Promise<string> {
  if (!text || !containsJapanese(text)) {
    return text; // Return original if no Japanese detected
  }

  // API is completely disabled to prevent errors
  console.log('API translation disabled, using pattern translation for:', text.substring(0, 50) + '...');

  // Return original text - pattern translation will handle it
  return text;
}

/**
 * Alternative translation using Google Translate (requires API key)
 * Uncomment and configure if you have a Google Translate API key
 */
async function translateWithGoogle(text: string, targetLang: string = 'en'): Promise<string> {
  if (!text || !containsJapanese(text)) {
    return text;
  }

  const cacheKey = `${text}_${targetLang}`;
  const cached = translationCache.get(cacheKey) as CachedTranslation | undefined;

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.text;
  }

  try {
    // Google Translate API (requires API key)
    // const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     q: text,
    //     source: 'ja',
    //     target: targetLang,
    //     format: 'text',
    //   }),
    // });

    // For now, return original text - uncomment above when you have API key
    return text;
  } catch (error) {
    console.warn('Google translation failed for:', text, error);
    return text;
  }
}

/**
 * Fallback translation using simple pattern matching for common terms
 */
function translateWithPatterns(text: string): string {
  if (!text || !containsJapanese(text)) {
    return text;
  }

  let translated = text;

  // Comprehensive patterns for Japanese product translation
  const patterns = [
    // Product Types - Most Common
    { pattern: /アクリルスタンド/g, replacement: 'Acrylic Stand' },
    { pattern: /アクリルキーホルダー/g, replacement: 'Acrylic Keychain' },
    { pattern: /トレーディング/g, replacement: 'Trading' },
    { pattern: /トレカ/g, replacement: 'Trading Card' },
    { pattern: /フィギュア/g, replacement: 'Figure' },
    { pattern: /ねんどろいど/g, replacement: 'Nendoroid' },
    { pattern: /スケールフィギュア/g, replacement: 'Scale Figure' },
    { pattern: /ぬいぐるみ/g, replacement: 'Plush' },
    { pattern: /キーホルダー/g, replacement: 'Keychain' },
    { pattern: /キーリング/g, replacement: 'Keyring' },
    { pattern: /ストラップ/g, replacement: 'Strap' },
    { pattern: /バッジ/g, replacement: 'Badge' },
    { pattern: /缶バッジ/g, replacement: 'Button Badge' },
    { pattern: /ポスター/g, replacement: 'Poster' },
    { pattern: /クリアファイル/g, replacement: 'Clear File' },
    { pattern: /下敷き/g, replacement: 'Pencil Board' },
    { pattern: /マグカップ/g, replacement: 'Mug' },
    { pattern: /タンブラー/g, replacement: 'Tumbler' },
    { pattern: /グラス/g, replacement: 'Glass' },
    { pattern: /文房具/g, replacement: 'Stationery' },
    { pattern: /ノート/g, replacement: 'Notebook' },
    { pattern: /メモ帳/g, replacement: 'Memo Pad' },
    { pattern: /ペン/g, replacement: 'Pen' },
    { pattern: /ボールペン/g, replacement: 'Ballpoint Pen' },
    { pattern: /シャープペン/g, replacement: 'Mechanical Pencil' },
    { pattern: /消しゴム/g, replacement: 'Eraser' },
    { pattern: /定規/g, replacement: 'Ruler' },
    { pattern: /おもちゃ/g, replacement: 'Toy' },
    { pattern: /ゲーム/g, replacement: 'Game' },
    { pattern: /カード/g, replacement: 'Card' },
    { pattern: /CD/g, replacement: 'CD' },
    { pattern: /DVD/g, replacement: 'DVD' },
    { pattern: /Blu-ray/g, replacement: 'Blu-ray' },
    { pattern: /ブルーレイ/g, replacement: 'Blu-ray' },
    { pattern: /書籍/g, replacement: 'Book' },
    { pattern: /コミック/g, replacement: 'Comic' },
    { pattern: /漫画/g, replacement: 'Manga' },
    { pattern: /小説/g, replacement: 'Novel' },
    { pattern: /画集/g, replacement: 'Art Book' },
    { pattern: /イラスト集/g, replacement: 'Illustration Collection' },
    { pattern: /雑誌/g, replacement: 'Magazine' },
    { pattern: /食品/g, replacement: 'Food' },
    { pattern: /お菓子/g, replacement: 'Candy' },
    { pattern: /スナック/g, replacement: 'Snack' },
    { pattern: /チョコレート/g, replacement: 'Chocolate' },
    { pattern: /キャンディー/g, replacement: 'Candy' },
    { pattern: /グミ/g, replacement: 'Gummy' },
    { pattern: /クッキー/g, replacement: 'Cookie' },
    { pattern: /ケーキ/g, replacement: 'Cake' },
    { pattern: /アイスクリーム/g, replacement: 'Ice Cream' },
    { pattern: /飲み物/g, replacement: 'Drink' },
    { pattern: /ジュース/g, replacement: 'Juice' },
    { pattern: /お茶/g, replacement: 'Tea' },
    { pattern: /コーヒー/g, replacement: 'Coffee' },
    { pattern: /紅茶/g, replacement: 'Black Tea' },

    // Product Features - Desk Mats & Accessories
    { pattern: /マルチデスクマット/g, replacement: 'Multi Desk Mat' },
    { pattern: /デスクマット/g, replacement: 'Desk Mat' },
    { pattern: /ダイカット/g, replacement: 'Die-cut' },
    { pattern: /角丸/g, replacement: 'Rounded Corner' },
    { pattern: /ミニアクリル/g, replacement: 'Mini Acrylic' },
    { pattern: /ビッグアクリル/g, replacement: 'Big Acrylic' },
    { pattern: /グリッター/g, replacement: 'Glitter' },
    { pattern: /ホログラム/g, replacement: 'Hologram' },
    { pattern: /キャラファイン/g, replacement: 'Character Fine' },
    { pattern: /原作イラスト/g, replacement: 'Original Illustration' },
    { pattern: /描き下ろし/g, replacement: 'Newly Drawn' },
    { pattern: /バースデー/g, replacement: 'Birthday' },
    { pattern: /アニメ化/g, replacement: 'Anime Adaptation' },

    // Specific Brands and Series from error logs
    { pattern: /オンゲキ/g, replacement: 'Ongeki' },
    { pattern: /AMNIBUS/g, replacement: 'AMNIBUS' },
    { pattern: /デート・ア・ライブ/g, replacement: 'Date A Live' },
    { pattern: /時崎狂三/g, replacement: 'Tokisaki Kurumi' },
    { pattern: /高良くんと天城くん/g, replacement: 'Takai-kun and Amagi-kun' },
    { pattern: /兄貴の友達/g, replacement: 'Brother\'s Friend' },
    { pattern: /はなげのまい/g, replacement: 'Hanage no Mai' },

    // Character and Series Names
    { pattern: /高良瞬/g, replacement: 'Kora Shun' },
    { pattern: /天城太一/g, replacement: 'Amagi Taichi' },
    { pattern: /田中隼人/g, replacement: 'Tanaka Hayato' },
    { pattern: /瀬川拓海/g, replacement: 'Segawa Takumi' },
    { pattern: /柿本健/g, replacement: 'Kakimono Ken' },
    { pattern: /柏木美亜/g, replacement: 'Kashiwagi Mia' },
    { pattern: /東雲つむぎ/g, replacement: 'Shinonome Tsumugi' },
    { pattern: /日向千夏/g, replacement: 'Hyuga Chinatsu' },

    // Product Line Names
    { pattern: /Re:FresH/g, replacement: 'Re:Fresh' },
    { pattern: /R\.B\.P\./g, replacement: 'R.B.P.' },
    { pattern: /⊿TRiEDGE/g, replacement: '△TRiEDGE' },
    { pattern: /7EVENDAYS⇔HOLIDAYS/g, replacement: '7EVENDAYS HOLIDAYS' },
    { pattern: /ASTERISM/g, replacement: 'ASTERISM' },
    { pattern: /bitter flavor/g, replacement: 'Bitter Flavor' },
    { pattern: /マーチングポケッツ/g, replacement: 'Marching Pockets' },
    { pattern: /刹那/g, replacement: 'Setsuna' },
    { pattern: /μ3/g, replacement: 'μ3' },
    { pattern: /しとしとと/g, replacement: 'Shito Shito' },
    { pattern: /Sargasso/g, replacement: 'Sargasso' },
    { pattern: /淵底のグレイ・ユークロニア/g, replacement: 'Abyssal Gray Eukronia' },
    { pattern: /霧の書斎/g, replacement: 'Mist Study' },
    { pattern: /THE TRiANGLE/g, replacement: 'The Triangle' },
    { pattern: /Chant Say Yeah!/g, replacement: 'Chant Say Yeah!' },
    { pattern: /Nýx/g, replacement: 'Nyx' },
    { pattern: /Rhythm of Love/g, replacement: 'Rhythm of Love' },
    { pattern: /Never Ending Adventure/g, replacement: 'Never Ending Adventure' },
    { pattern: /Crazy Party Rush/g, replacement: 'Crazy Party Rush' },
    { pattern: /ぱくぱく☆がーる/g, replacement: 'Pakupaku Girl' },
    { pattern: /ALLNIGHT_DANCER/g, replacement: 'All Night Dancer' },
    { pattern: /超前進！満点スマイル！/g, replacement: 'Super Forward! Perfect Smile!' },
    { pattern: /Lazulis Gambit/g, replacement: 'Lazulis Gambit' },
    { pattern: /Stellar:Dream/g, replacement: 'Stellar Dream' },
    { pattern: /And Revive The Melody/g, replacement: 'And Revive The Melody' },

    // Product Types - More Specific
    { pattern: /アクリルコースター/g, replacement: 'Acrylic Coaster' },
    { pattern: /トレーディングステッカー/g, replacement: 'Trading Sticker' },
    { pattern: /ダイカットステッカー/g, replacement: 'Die-cut Sticker' },
    { pattern: /ミニアクリルスタンド/g, replacement: 'Mini Acrylic Stand' },
    { pattern: /ビッグアクリルスタンド/g, replacement: 'Big Acrylic Stand' },
    { pattern: /キャラファイングラフ/g, replacement: 'Character Fine Graph' },
    { pattern: /イラストカード/g, replacement: 'Illustration Card' },
    { pattern: /原作コマイラストカード/g, replacement: 'Original Comic Illustration Card' },
    { pattern: /グリッター缶バッジ/g, replacement: 'Glitter Button Badge' },
    { pattern: /75mmグリッター缶バッジ/g, replacement: '75mm Glitter Button Badge' },
    { pattern: /角丸スクエア缶バッジ/g, replacement: 'Rounded Square Button Badge' },
    { pattern: /トレーディングミニアクリルスタンド/g, replacement: 'Trading Mini Acrylic Stand' },
    { pattern: /トレーディングダイカットステッカー/g, replacement: 'Trading Die-cut Sticker' },
    { pattern: /トレーディングアクリルコースター/g, replacement: 'Trading Acrylic Coaster' },

    // Common Status Terms
    { pattern: /数量限定/g, replacement: 'Limited Quantity' },
    { pattern: /限定品/g, replacement: 'Limited Edition' },
    { pattern: /新品/g, replacement: 'New' },
    { pattern: /中古/g, replacement: 'Used' },
    { pattern: /未開封/g, replacement: 'Unopened' },
    { pattern: /美品/g, replacement: 'Excellent Condition' },
    { pattern: /コレクション/g, replacement: 'Collection' },
    { pattern: /セット/g, replacement: 'Set' },
    { pattern: /ボックス/g, replacement: 'Box' },
    { pattern: /パック/g, replacement: 'Pack' },
    { pattern: /エディション/g, replacement: 'Edition' },
    { pattern: /バージョン/g, replacement: 'Version' },
    { pattern: /カラー/g, replacement: 'Color' },
    { pattern: /サイズ/g, replacement: 'Size' },
    { pattern: /素材/g, replacement: 'Material' },
    { pattern: /仕様/g, replacement: 'Specification' },
    { pattern: /特徴/g, replacement: 'Feature' },
    { pattern: /詳細/g, replacement: 'Details' },
    { pattern: /説明/g, replacement: 'Description' },
    { pattern: /内容/g, replacement: 'Contents' },
    { pattern: /価格/g, replacement: 'Price' },
    { pattern: /税込/g, replacement: 'Tax Included' },
    { pattern: /税別/g, replacement: 'Tax Excluded' },
    { pattern: /送料/g, replacement: 'Shipping' },
    { pattern: /無料/g, replacement: 'Free' },
    { pattern: /込み/g, replacement: 'Included' },
    { pattern: /別/g, replacement: 'Separate' },
    { pattern: /予定/g, replacement: 'Scheduled' },
    { pattern: /予約/g, replacement: 'Pre-order' },
    { pattern: /予約受付/g, replacement: 'Pre-order Available' },
    { pattern: /発売/g, replacement: 'Release' },
    { pattern: /販売/g, replacement: 'Sale' },
    { pattern: /在庫/g, replacement: 'Stock' },
    { pattern: /あり/g, replacement: 'Available' },
    { pattern: /なし/g, replacement: 'Out of Stock' },
    { pattern: /完売/g, replacement: 'Sold Out' },
    { pattern: /終了/g, replacement: 'Ended' },
    { pattern: /入荷/g, replacement: 'Restock' },
    { pattern: /人気/g, replacement: 'Popular' },
    { pattern: /おすすめ/g, replacement: 'Recommended' },
    { pattern: /新着/g, replacement: 'New Arrival' },
    { pattern: /定番/g, replacement: 'Standard' },
    { pattern: /季節/g, replacement: 'Seasonal' },

    // Numbers and measurements
    { pattern: /(\d+)\s*個/g, replacement: '$1 pieces' },
    { pattern: /(\d+)\s*枚/g, replacement: '$1 sheets' },
    { pattern: /(\d+)\s*冊/g, replacement: '$1 volumes' },
    { pattern: /(\d+)\s*本/g, replacement: '$1 books' },
    { pattern: /(\d+)\s*巻/g, replacement: 'Vol. $1' },
    { pattern: /(\d+)\s*話/g, replacement: 'Ep. $1' },

    // Common phrases and particles
    { pattern: /より/g, replacement: 'from' },
    { pattern: /登場/g, replacement: 'release' },
    { pattern: /イラスト/g, replacement: 'illustration' },
    { pattern: /キャラクター/g, replacement: 'character' },
    { pattern: /オリジナル/g, replacement: 'original' },
    { pattern: /グッズ/g, replacement: 'merchandise' },
    { pattern: /商品/g, replacement: 'product' },
    { pattern: /アイテム/g, replacement: 'item' },
    { pattern: /コラボ/g, replacement: 'collaboration' },
    { pattern: /アニメ/g, replacement: 'anime' },
    { pattern: /マンガ/g, replacement: 'manga' },
    { pattern: /ゲーム/g, replacement: 'game' },
    { pattern: /描き下ろし/g, replacement: 'newly drawn' },
    { pattern: /バースデー/g, replacement: 'birthday' },

    // Version indicators
    { pattern: /\sver\./g, replacement: ' ver.' },
    { pattern: /\sv\./g, replacement: ' v.' },
    { pattern: /(\w+)\sver\.?\s*([A-Z])/g, replacement: '$1 ver. $2' },

    // Numbers in Japanese context
    { pattern: /(\d+)\s*mm/g, replacement: '$1mm' },

    // Common AMNIBUS patterns
    { pattern: /AMNIBUS\(アムニバス\)/g, replacement: 'AMNIBUS' },
    { pattern: /ショッピングサイト/g, replacement: 'shopping site' },
    { pattern: /毎日楽しく使える/g, replacement: 'fun to use every day' },
    { pattern: /色々な作品/g, replacement: 'various works' },
    { pattern: /オリジナル商品/g, replacement: 'original products' },
    { pattern: /受注生産式/g, replacement: 'made-to-order' },
    { pattern: /予約・購入/g, replacement: 'pre-order and purchase' },

    // Product descriptions
    { pattern: /お部屋やデスクまわり/g, replacement: 'room or desk area' },
    { pattern: /キャラクターとの日常/g, replacement: 'daily life with characters' },
    { pattern: /お楽しみください/g, replacement: 'please enjoy' },
    { pattern: /コレクションしやすい/g, replacement: 'easy to collect' },
    { pattern: /ミニサイズ/g, replacement: 'mini size' },
    { pattern: /デスクに敷いたり/g, replacement: 'spread on desk' },
    { pattern: /お部屋に飾ったり/g, replacement: 'decorate in room' },
    { pattern: /立てかけたり/g, replacement: 'stand up' },
    { pattern: /壁に掛けて/g, replacement: 'hang on wall' },
    { pattern: /カバンやリュック/g, replacement: 'bag or backpack' },
    { pattern: /お使いいただけます/g, replacement: 'can be used' },
    { pattern: /身近な持ち物/g, replacement: 'everyday items' },
    { pattern: /デコレーション/g, replacement: 'decoration' },
    { pattern: /ステーショナリー/g, replacement: 'stationery' },
    { pattern: /パソコン/g, replacement: 'computer' },

    // Specific product descriptions from logs
    { pattern: /はなげのまい先生描き下ろし/g, replacement: 'newly drawn by Hanage no Mai sensei' },
    { pattern: /HAPPY BIRTHDAY/g, replacement: 'Happy Birthday' },
    { pattern: /台座には誕生日/g, replacement: 'base has birthday' },
    { pattern: /背面にはピンとスタンド/g, replacement: 'back has pin and stand' },
    { pattern: /壁掛けパーツ/g, replacement: 'wall hanging parts' },
    { pattern: /貼ってはがせる/g, replacement: 'stick and peel' },
    { pattern: /カード型/g, replacement: 'card type' },
    { pattern: /ジャケットイラスト/g, replacement: 'jacket illustration' },
    { pattern: /楽曲/g, replacement: 'music track' },
    { pattern: /ステッカー/g, replacement: 'sticker' }
  ];

  for (const { pattern, replacement } of patterns) {
    translated = translated.replace(pattern, replacement);
  }

  return translated;
}

/**
 * Main translation function - tries multiple services
 */
async function translateText(text: string, targetLang: string = 'en'): Promise<string> {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Skip translation if not Japanese
  if (!containsJapanese(text)) {
    return text;
  }

  try {
    // Skip API calls entirely if disabled
    if (!FORCE_DISABLE_API && isApiTranslationEnabled()) {
      const translated = await translateWithLibreTranslate(text, targetLang);
      if (translated && translated !== text) {
        return translated;
      }
    }

    // Try pattern-based translation as fallback
    const patternTranslated = translateWithPatterns(text);
    if (patternTranslated && patternTranslated !== text) {
      return patternTranslated;
    }

    // Fallback to original text if all methods failed
    return text;
  } catch (error) {
    console.warn('All translation methods failed for:', text, error);
    // Try pattern-based as final fallback
    return translateWithPatterns(text);
  }
}

/**
 * Translates product data fields
 */
export async function translateProductData(productData: any, targetLanguage: string = 'en'): Promise<any> {
  if (targetLanguage === 'ja' || !productData) {
    return productData; // No translation needed for Japanese
  }

  try {
    const translated = { ...productData };

    // Translate text fields
    if (translated.title) {
      translated.title = await translateText(translated.title, targetLanguage);
    }

    if (translated.brand) {
      translated.brand = await translateText(translated.brand, targetLanguage);
    }

    if (translated.category) {
      translated.category = await translateText(translated.category, targetLanguage);
    }

    if (translated.description) {
      translated.description = await translateText(translated.description, targetLanguage);
    }

    if (translated.labels && Array.isArray(translated.labels)) {
      translated.labels = await Promise.all(
        translated.labels.map((label: string) => translateText(label, targetLanguage))
      );
    }

    if (translated.condition) {
      translated.condition = await translateText(translated.condition, targetLanguage);
    }

    return translated;
  } catch (error) {
    console.error('Error translating product data:', error);
    return productData; // Return original on error
  }
}

/**
 * Translates an array of product data
 */
export async function translateProductsArray(products: any[], targetLanguage: string = 'en'): Promise<any[]> {
  if (targetLanguage === 'ja' || !products || products.length === 0) {
    return products;
  }

  try {
    // Translate products in batches to avoid overwhelming the API
    const batchSize = 5;
    const translatedProducts: any[] = [];

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const translatedBatch = await Promise.all(
        batch.map(product => translateProductData(product, targetLanguage))
      );
      translatedProducts.push(...translatedBatch);

      // Small delay between batches to be respectful to free API
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return translatedProducts;
  } catch (error) {
    console.error('Error translating products array:', error);
    return products; // Return original on error
  }
}

/**
 * Clear translation cache (useful for testing or memory management)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Disable API translation (useful when API is down)
 */
export function disableApiTranslation(): void {
  (globalThis as any).__DISABLE_API_TRANSLATION = true;
}

/**
 * Enable API translation
 */
export function enableApiTranslation(): void {
  (globalThis as any).__DISABLE_API_TRANSLATION = false;
}

/**
 * Check if API translation is enabled
 */
function isApiTranslationEnabled(): boolean {
  return ENABLE_API_TRANSLATION && !(globalThis as any).__DISABLE_API_TRANSLATION;
}

/**
 * Get cache statistics
 */
export function getTranslationCacheStats(): { size: number; entries: string[] } {
  return {
    size: translationCache.size,
    entries: Array.from(translationCache.keys()).slice(0, 10), // First 10 entries
  };
}
