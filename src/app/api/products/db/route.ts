import { NextRequest, NextResponse } from 'next/server';
import {
    getAllScrapedProducts,
    getScrapedProductsPage,
    getScrapedProductById,
    deleteScrapedProduct,
    clearAllScrapedProducts,
    getScrapingStats,
    getRecentScrapingJobs
} from '@/lib/db/scraped-products';
import { translateProductsArray } from '@/lib/translation-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/db
 * Get scraped products from Firestore
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const productId = searchParams.get('id');
        const sourceSite = searchParams.get('source');
        const availability = searchParams.get('availability') as 'in' | 'out' | null;
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : undefined;
        const cursorTs = searchParams.get('cursorTs');
        const cursorId = searchParams.get('cursorId');

        // Detect target language for translation
        const langParam = searchParams.get('lang');
        const acceptLanguage = request.headers.get('accept-language') || '';
        const targetLanguage = langParam || (acceptLanguage.includes('ja') ? 'ja' : 'en');

        // Get single product by ID
        if (action === 'get' && productId) {
            const product = await getScrapedProductById(productId);
            
            if (!product) {
                return NextResponse.json(
                    { error: 'Product not found' },
                    { status: 404 }
                );
            }
            
            // Fix concatenated price and add type mapping
            let fixedPrice = product.price || 0;
            if (fixedPrice > 100000) {
                const priceStr = String(fixedPrice);
                const firstPrice = parseInt(priceStr.substring(0, Math.min(5, priceStr.length)));
                fixedPrice = Math.round((firstPrice / 150) * 100) / 100;
            }

            // Map availability to frontend expected values
            let mappedAvailability: 'in' | 'out' = 'in';
            if (product.availability === 'preorder' || product.availability === 'in') {
                mappedAvailability = 'in';
            } else if (product.availability === 'out' || product.isSoldOut) {
                mappedAvailability = 'out';
            }

            // Translate product data if needed
            const productToTranslate = {
                ...product,
                price: fixedPrice,
                type: product.category || 'General',
                availability: mappedAvailability,
            };

            try {
                const translatedProduct = (await translateProductsArray([productToTranslate], targetLanguage))[0];
                return NextResponse.json({ product: translatedProduct });
            } catch (error) {
                console.error('Translation failed for single product, returning original:', error);
                return NextResponse.json({ product: productToTranslate });
            }
        }

        // Get statistics
        if (action === 'stats') {
            const stats = await getScrapingStats();
            return NextResponse.json({ stats });
        }

        // Get recent scraping jobs
        if (action === 'jobs') {
            const jobLimit = limitParam ? parseInt(limitParam) : 10;
            const jobs = await getRecentScrapingJobs(jobLimit);
            return NextResponse.json({ jobs });
        }

        // Get all products with filters - always use paginated version for consistency
        const { products, nextCursor } = await getScrapedProductsPage(limit || 48,
            cursorTs && cursorId ? { ts: parseInt(cursorTs), id: cursorId } : undefined
        );
            
            // Transform products to match frontend expectations and fix prices
            const transformedProducts = products.map(p => {
                // Fix concatenated prices - extract first 4-5 digits as actual JPY price
                let fixedPrice = p.price || 0;
                if (fixedPrice > 100000) {
                    // Convert concatenated number to string and extract first 4-5 digits
                    const priceStr = String(fixedPrice);
                    const firstPrice = parseInt(priceStr.substring(0, Math.min(5, priceStr.length)));
                    // Convert JPY to USD (rough estimate: 1 USD = 150 JPY)
                    fixedPrice = Math.round((firstPrice / 150) * 100) / 100;
                }

                // Map availability to frontend expected values
                let mappedAvailability: 'in' | 'out' = 'in';
                if (p.availability === 'preorder' || p.availability === 'in') {
                    mappedAvailability = 'in';
                } else if (p.availability === 'out' || p.isSoldOut) {
                    mappedAvailability = 'out';
                }

                return {
                    ...p,
                    price: fixedPrice,
                    // Map category to type for frontend compatibility
                    type: p.category || 'General',
                    // Map availability to expected values
                    availability: mappedAvailability,
                };
            });

        // Apply translation if needed
        try {
            const translatedProducts = await translateProductsArray(transformedProducts, targetLanguage);

            return NextResponse.json({
                success: true,
                products: translatedProducts,
                count: translatedProducts.length,
                nextCursor,
            });
        } catch (error) {
            console.error('Translation failed for paginated products, returning original:', error);
            return NextResponse.json({
                success: true,
                products: transformedProducts,
                count: transformedProducts.length,
                nextCursor,
            });
        }

    } catch (error) {
        console.error('Error fetching products from database:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch products',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/products/db
 * Delete products from Firestore
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const productId = searchParams.get('id');

        // Delete single product
        if (productId) {
            await deleteScrapedProduct(productId);
            return NextResponse.json({
                success: true,
                message: 'Product deleted successfully',
            });
        }

        // Clear all products (requires confirmation)
        if (action === 'clear') {
            const count = await clearAllScrapedProducts();
            return NextResponse.json({
                success: true,
                message: `Cleared ${count} products`,
                count,
            });
        }

        return NextResponse.json(
            { error: 'Product ID or action required' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Error deleting products:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete products',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
