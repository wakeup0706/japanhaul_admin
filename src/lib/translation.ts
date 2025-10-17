/**
 * Translation service for converting Japanese text to English
 * Used to translate scraped product data from Japanese to English when displaying in English mode
 */

// Japanese to English translation dictionary for common product-related terms
const japaneseToEnglish: Record<string, string> = {
  // Product categories and types
  'アニメ': 'Anime',
  'マンガ': 'Manga',
  'キャラクター': 'Character',
  'グッズ': 'Merchandise',
  'フィギュア': 'Figure',
  'プラモデル': 'Plastic Model',
  'ぬいぐるみ': 'Plush',
  'キーホルダー': 'Keychain',
  'ストラップ': 'Strap',
  'バッジ': 'Badge',
  'ポスター': 'Poster',
  'クリアファイル': 'Clear File',
  'マグカップ': 'Mug',
  'タンブラー': 'Tumbler',
  '文房具': 'Stationery',
  'ノート': 'Notebook',
  'ペン': 'Pen',
  '鉛筆': 'Pencil',
  '消しゴム': 'Eraser',
  '定規': 'Ruler',
  'おもちゃ': 'Toy',
  'ゲーム': 'Game',
  'カード': 'Card',
  'トレカ': 'Trading Card',
  'CD': 'CD',
  'DVD': 'DVD',
  'Blu-ray': 'Blu-ray',
  '書籍': 'Book',
  'コミック': 'Comic',
  '小説': 'Novel',
  '画集': 'Art Book',
  '雑誌': 'Magazine',
  '食品': 'Food',
  'お菓子': 'Candy',
  'スナック': 'Snack',
  'チョコレート': 'Chocolate',
  'キャンディー': 'Candy',
  'グミ': 'Gummy',
  'クッキー': 'Cookie',
  'ケーキ': 'Cake',
  'アイスクリーム': 'Ice Cream',
  '飲み物': 'Drink',
  'ジュース': 'Juice',
  'お茶': 'Tea',
  'コーヒー': 'Coffee',
  '服': 'Clothing',
  'Tシャツ': 'T-Shirt',
  'パーカー': 'Hoodie',
  'バッグ': 'Bag',
  '財布': 'Wallet',
  '靴': 'Shoes',
  'アクセサリー': 'Accessory',
  'イヤリング': 'Earrings',
  'ネックレス': 'Necklace',
  'ブレスレット': 'Bracelet',
  '指輪': 'Ring',
  '化粧品': 'Cosmetics',
  '香水': 'Perfume',
  'スキンケア': 'Skincare',
  'メイク': 'Makeup',
  'シャンプー': 'Shampoo',
  'コンディショナー': 'Conditioner',
  'ボディソープ': 'Body Soap',
  'ヘアケア': 'Hair Care',
  '限定': 'Limited',
  '数量限定': 'Limited Quantity',
  '新品': 'New',
  '中古': 'Used',
  '未開封': 'Unopened',
  '美品': 'Excellent Condition',
  'コレクション': 'Collection',
  'セット': 'Set',
  'ボックス': 'Box',
  'パック': 'Pack',
  '個': 'Piece',
  '枚': 'Sheet',
  '冊': 'Volume',
  '本': 'Book',
  '巻': 'Volume',
  '話': 'Episode',
  'シリーズ': 'Series',
  'エディション': 'Edition',
  'バージョン': 'Version',
  'カラー': 'Color',
  'サイズ': 'Size',
  '素材': 'Material',
  '仕様': 'Specification',
  '特徴': 'Feature',
  '詳細': 'Details',
  '説明': 'Description',
  '内容': 'Contents',
  '価格': 'Price',
  '税込': 'Tax Included',
  '税別': 'Tax Excluded',
  '送料': 'Shipping',
  '無料': 'Free',
  '込み': 'Included',
  '別': 'Separate',
  '予定': 'Scheduled',
  '予約': 'Pre-order',
  '発売': 'Release',
  '販売': 'Sale',
  '在庫': 'Stock',
  'あり': 'Available',
  'なし': 'Out of Stock',
  '完売': 'Sold Out',
  '終了': 'Ended',
  '入荷': 'Restock',
  '人気': 'Popular',
  'おすすめ': 'Recommended',
  '新着': 'New Arrival',
  '定番': 'Standard',
  '季節': 'Seasonal',
  'クリスマス': 'Christmas',
  'ハロウィン': 'Halloween',
  'バレンタイン': 'Valentine',
  'ホワイトデー': 'White Day',
  '夏祭り': 'Summer Festival',
  '正月': 'New Year',
  '桜': 'Cherry Blossom',
  '秋葉原': 'Akihabara',
  '東京': 'Tokyo',
  '日本': 'Japan',
  '海外': 'Overseas',
  '輸入': 'Import',
  '国内': 'Domestic',
  '公式': 'Official',
  '非公式': 'Unofficial',
  'レア': 'Rare',
  'プレミアム': 'Premium',
  'スペシャル': 'Special',
  'エクスクルーシブ': 'Exclusive',
  'イベント': 'Event',
  'キャンペーン': 'Campaign',
  'セール': 'Sale',
  'バーゲン': 'Bargain',
  'アウトレット': 'Outlet',
  '福袋': 'Lucky Bag',
  'プレゼント': 'Present',
  'ギフト': 'Gift',
  '誕生日': 'Birthday',
  '記念': 'Anniversary',
  'コラボ': 'Collaboration',
  'タイアップ': 'Tie-up',
  'アニメイト': 'Animate',
  'ゲーマーズ': 'Gamers',
  'とらのあな': 'Toranoana',
  'メロンブックス': 'Melonbooks',
  'ボークス': 'Volks',
  'コトブキヤ': 'Kotobukiya',
  'バンダイ': 'Bandai',
  'タカラトミー': 'Takara Tomy',
  'ハズブロ': 'Hasbro',
  'マテル': 'Mattel',
  'レゴ': 'LEGO',
  'ポケモン': 'Pokemon',
  'ポケットモンスター': 'Pokemon',
  'ドラゴンボール': 'Dragon Ball',
  'ワンピース': 'One Piece',
  'ナルト': 'Naruto',
  '進撃の巨人': 'Attack on Titan',
  'エヴァンゲリオン': 'Evangelion',
  'ガンダム': 'Gundam',
  '仮面ライダー': 'Kamen Rider',
  'スーパー戦隊': 'Super Sentai',
  'プリキュア': 'Precure',
  'ラブライブ': 'Love Live',
  'アイドルマスター': 'The Idolmaster',
  '初音ミク': 'Hatsune Miku',
  'ボーカロイド': 'Vocaloid',
  '東方': 'Touhou',
  '艦これ': 'Kancolle',
  'Fate': 'Fate',
  '型月': 'Type-Moon',
  'ディズニー': 'Disney',
  'マーベル': 'Marvel',
  'DCコミックス': 'DC Comics',
  'スターウォーズ': 'Star Wars',
  'ハリーポッター': 'Harry Potter',
  'ジブリ': 'Studio Ghibli',
  'サンリオ': 'Sanrio',
  'ハローキティ': 'Hello Kitty',
  'マイメロディ': 'My Melody',
  'ポムポムプリン': 'Pompompurin',
  'シナモロール': 'Cinnamoroll',
  'クロミ': 'Kuromi',
  'ポチャッコ': 'Pochacco',
  'けろけろけろっぴ': 'Keroppi',
  'バッドばつ丸': 'Badtz-Maru',
  'タキシードサム': 'Tuxedo Sam',
  'あひるのペックル': 'Pekkle',
  'ハンギョドン': 'Hangyodon'
};

// Common Japanese patterns to translate
const japanesePatterns: Array<{ pattern: RegExp; replacement: string }> = [
  // Numbers and measurements
  { pattern: /(\d+)\s*個/g, replacement: '$1 pieces' },
  { pattern: /(\d+)\s*枚/g, replacement: '$1 sheets' },
  { pattern: /(\d+)\s*冊/g, replacement: '$1 volumes' },
  { pattern: /(\d+)\s*本/g, replacement: '$1 books' },
  { pattern: /(\d+)\s*巻/g, replacement: 'Vol. $1' },
  { pattern: /(\d+)\s*話/g, replacement: 'Ep. $1' },

  // Common phrases
  { pattern: /限定品/g, replacement: 'Limited Edition' },
  { pattern: /数量限定/g, replacement: 'Limited Quantity' },
  { pattern: /新品未開封/g, replacement: 'Brand New Unopened' },
  { pattern: /美品/g, replacement: 'Excellent Condition' },
  { pattern: /中古/g, replacement: 'Used' },
  { pattern: /完売/g, replacement: 'Sold Out' },
  { pattern: /在庫切れ/g, replacement: 'Out of Stock' },
  { pattern: /予約受付中/g, replacement: 'Pre-order Available' },
  { pattern: /予約開始/g, replacement: 'Pre-order Started' },
  { pattern: /発売中/g, replacement: 'On Sale' },
  { pattern: /販売終了/g, replacement: 'Sales Ended' },
  { pattern: /税込/g, replacement: 'Tax Included' },
  { pattern: /税別/g, replacement: 'Tax Excluded' },
  { pattern: /送料無料/g, replacement: 'Free Shipping' },
  { pattern: /送料込み/g, replacement: 'Shipping Included' },
  { pattern: /即日発送/g, replacement: 'Same Day Shipping' },
  { pattern: /翌日発送/g, replacement: 'Next Day Shipping' },
  { pattern: /ポイント/g, replacement: 'Points' },
  { pattern: /クーポン/g, replacement: 'Coupon' },
  { pattern: /割引/g, replacement: 'Discount' },
  { pattern: /セール/g, replacement: 'Sale' },
  { pattern: /バーゲン/g, replacement: 'Bargain' },
  { pattern: /キャンペーン/g, replacement: 'Campaign' },
  { pattern: /イベント/g, replacement: 'Event' },
  { pattern: /コラボ/g, replacement: 'Collaboration' },
  { pattern: /タイアップ/g, replacement: 'Tie-up' },
  { pattern: /グッズ/g, replacement: 'Merchandise' },
  { pattern: /商品/g, replacement: 'Product' },
  { pattern: /アイテム/g, replacement: 'Item' },
  { pattern: /セット/g, replacement: 'Set' },
  { pattern: /パック/g, replacement: 'Pack' },
  { pattern: /ボックス/g, replacement: 'Box' },
  { pattern: /コレクション/g, replacement: 'Collection' },
  { pattern: /シリーズ/g, replacement: 'Series' },
  { pattern: /エディション/g, replacement: 'Edition' },
  { pattern: /バージョン/g, replacement: 'Version' },
  { pattern: /カラー/g, replacement: 'Color' },
  { pattern: /サイズ/g, replacement: 'Size' },
  { pattern: /素材/g, replacement: 'Material' },
  { pattern: /仕様/g, replacement: 'Specification' },
  { pattern: /特徴/g, replacement: 'Feature' },
  { pattern: /詳細/g, replacement: 'Details' },
  { pattern: /説明/g, replacement: 'Description' },
  { pattern: /内容/g, replacement: 'Contents' }
];

/**
 * Translates Japanese text to English
 * @param japaneseText - The Japanese text to translate
 * @returns The translated English text or the original if no translation found
 */
export function translateJapaneseToEnglish(japaneseText: string): string {
  if (!japaneseText || typeof japaneseText !== 'string') {
    return japaneseText;
  }

  let translated = japaneseText;

  // First, try exact matches from the dictionary
  if (japaneseToEnglish[translated]) {
    return japaneseToEnglish[translated];
  }

  // Apply pattern-based translations
  for (const { pattern, replacement } of japanesePatterns) {
    translated = translated.replace(pattern, replacement);
  }

  // If the text contains Japanese characters but wasn't translated, try to find partial matches
  if (translated !== japaneseText && /[ぁ-んァ-ン一-龯]/.test(japaneseText)) {
    // Look for individual Japanese words in the dictionary
    const words = japaneseText.split(/[\s\-・\/()（）]+/);
    for (const word of words) {
      if (japaneseToEnglish[word] && word.length > 1) {
        translated = translated.replace(new RegExp(word, 'g'), japaneseToEnglish[word]);
      }
    }
  }

  return translated;
}

/**
 * Translates product data from Japanese to English if needed
 * @param productData - The product data object
 * @param targetLanguage - The target language ('en' or 'ja')
 * @returns The translated product data
 */
export function translateProductData(productData: any, targetLanguage: string = 'en'): any {
  if (targetLanguage === 'ja') {
    return productData; // No translation needed for Japanese
  }

  return {
    ...productData,
    title: translateJapaneseToEnglish(productData.title || ''),
    brand: translateJapaneseToEnglish(productData.brand || ''),
    category: translateJapaneseToEnglish(productData.category || ''),
    description: translateJapaneseToEnglish(productData.description || ''),
    // Translate labels array if it exists
    labels: productData.labels?.map((label: string) => translateJapaneseToEnglish(label)) || [],
    // Translate condition if it exists
    condition: productData.condition ? translateJapaneseToEnglish(productData.condition) : productData.condition
  };
}

/**
 * Translates an array of product data
 * @param products - Array of product objects
 * @param targetLanguage - The target language ('en' or 'ja')
 * @returns Array of translated product objects
 */
export function translateProductsArray(products: any[], targetLanguage: string = 'en'): any[] {
  if (targetLanguage === 'ja') {
    return products; // No translation needed for Japanese
  }

  return products.map(product => translateProductData(product, targetLanguage));
}
