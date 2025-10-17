export type Product = {
    id: string;
    title: string;
    price: number;
    compareAt?: number;
    brand: string;
    type: string;
    availability: "in" | "out";
    labels?: string[]; // For "Sold", "Used", etc.
    condition?: "new" | "used" | "refurbished";
    isSoldOut?: boolean;
    sourceUrl: string;
    imageUrl?: string; // URL to product image
    description?: string; // Product description
};

export const brands = ["Adele", "Apex heart", "Disney", "Calbee", "Bloom"] as const;

export const types = [
    "Anime Snacks",
    "Chocolate",
    "Mochi",
    "Kitchenware",
    "Candy, Gummy & Jelly",
] as const;

export const products: Product[] = Array.from({ length: 48 }).map((_, i) => {
    const base = (i + 1) * 3;
    const onSale = i % 3 === 0;
    return {
        id: `p${i + 1}`,
        title: `Product ${i + 1}`,
        price: onSale ? Math.round(base * 0.7 * 100) / 100 : base,
        compareAt: onSale ? base : undefined,
        brand: brands[i % brands.length],
        type: types[i % types.length],
        availability: i % 7 === 0 ? "out" : "in",
        sourceUrl: `/products/p${i + 1}`,
    };
});

// Global cache for scraped products - disabled for debugging
let scrapedProductsCache: Product[] | null = null;

/**
 * Fetch scraped products from the Firestore database
 */
export async function getScrapedProducts(limit: number = 48): Promise<Product[]> {
    // Cache disabled for debugging

    try {
        // Fetch from Firebase database instead of in-memory API
        // Add language parameter for translation (default to 'en' if not specified)
        const lang = typeof window !== 'undefined' ? (document.documentElement.lang || 'en') : 'en';
        // Use relative URL - Next.js handles this correctly for both client and server
        const response = await fetch(`/api/products/db?limit=${encodeURIComponent(String(limit))}&lang=${lang}`);

        if (!response.ok) {
            console.warn('Failed to fetch products from database:', response.statusText);
            return [];
        }

    const data = await response.json();
        
        // Transform database products to match Product type
        const dbProducts = (data.products || []).map((p: {
            id: string;
            title: string;
            price: number;
            originalPrice?: number;
            brand: string;
            category: string;
            imageUrl?: string;
            description?: string;
            availability: 'in' | 'out';
            sourceUrl: string;
            condition?: "new" | "used" | "refurbished";
            isSoldOut?: boolean;
            labels?: string[];
        }) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            compareAt: p.originalPrice,
            brand: p.brand,
            type: p.category,
            availability: p.availability,
            labels: p.labels,
            condition: p.condition,
            isSoldOut: p.isSoldOut,
            sourceUrl: p.sourceUrl,
            imageUrl: p.imageUrl,
            description: p.description,
        }));

    scrapedProductsCache = dbProducts;

        return scrapedProductsCache || [];
    } catch (error) {
        console.error('Error fetching products from database:', error);
        return [];
    }
}

/**
 * Get all products (hardcoded + scraped from database)
 */
export async function getAllProducts(limit: number = 48): Promise<Product[]> {
    const scrapedProducts = await getScrapedProducts(limit);
    
    console.log('📊 getAllProducts - Scraped products count:', scrapedProducts.length);
    if (scrapedProducts.length > 0) {
        console.log('✅ Sample scraped product:', scrapedProducts[0]);
    }
    
    // Return only scraped products from database (no hardcoded products)
    // If you want to include hardcoded products as fallback, use: [...products, ...scrapedProducts]
    return scrapedProducts.length > 0 ? scrapedProducts : products;
}

/**
 * Get one page of products from the server (API) using cursor.
 */
export async function getProductsPage(limit: number = 48, cursor?: { ts: number; id: string }): Promise<{
    products: Product[];
    nextCursor: { ts: number; id: string } | null;
}> {
    // Use relative URL - Next.js handles this correctly for both client and server
    const url = new URL(`/api/products/db`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    url.searchParams.set('limit', String(limit));
    if (cursor) {
        url.searchParams.set('cursorTs', String(cursor.ts));
        url.searchParams.set('cursorId', cursor.id);
    }

    // Add language parameter for translation
    const lang = typeof window !== 'undefined' ? (document.documentElement.lang || 'en') : 'en';
    url.searchParams.set('lang', lang);

    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error('Failed to fetch products page');
    const data = await resp.json();

    const dbProducts = (data.products || []).map((p: {
        id: string;
        title: string;
        price: number;
        originalPrice?: number;
        brand: string;
        category: string;
        imageUrl?: string;
        description?: string;
        availability: 'in' | 'out';
        sourceUrl: string;
        condition?: "new" | "used" | "refurbished";
        isSoldOut?: boolean;
        labels?: string[];
    }) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        compareAt: p.originalPrice,
        brand: p.brand,
        type: p.category,
        availability: p.availability,
        labels: p.labels,
        condition: p.condition,
        isSoldOut: p.isSoldOut,
        sourceUrl: p.sourceUrl,
        imageUrl: p.imageUrl,
        description: p.description,
    })) as Product[];

    return { products: dbProducts, nextCursor: data.nextCursor || null };
}

/**
 * Add scraped products to the store
 */
export async function addScrapedProducts(newProducts: Omit<Product, 'id'>[]): Promise<Product[]> {
    try {
        const productsToAdd = newProducts.map(product => ({
            id: `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...product,
        }));

        // Use relative URL - Next.js handles this correctly
        const response = await fetch(`/api/products/scraped`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                products: productsToAdd,
                replace: false,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to store scraped products');
        }

        const data = await response.json();

        // Clear cache to force refresh
        scrapedProductsCache = null;

        return data.products;
    } catch (error) {
        console.error('Error adding scraped products:', error);
        throw error;
    }
}

/**
 * Clear all scraped products
 */
export async function clearScrapedProducts(): Promise<void> {
    try {
        // Use relative URL - Next.js handles this correctly
        const response = await fetch(`/api/products/scraped`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to clear scraped products');
        }

        // Clear cache
        scrapedProductsCache = null;
    } catch (error) {
        console.error('Error clearing scraped products:', error);
        throw error;
    }
}


