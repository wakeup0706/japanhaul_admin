/**
 * Firestore Database Service for Scraped Products and Orders
 *
 * Collections Structure:
 * - scrapedProducts/{productId} - Individual scraped products
 * - scrapingJobs/{jobId} - Scraping job history and status
 * - orders/{orderId} - Customer orders with contact and delivery details
 */

import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    deleteDoc,
    updateDoc,
    writeBatch,
    Timestamp,
    QueryConstraint,
    startAfter,
    addDoc
} from 'firebase/firestore';

// TypeScript interfaces
export interface ScrapedProductDB {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    brand: string;
    category: string;
    imageUrl?: string;
    images?: string[]; // gallery images from detail page
    description?: string;
    availability: 'in' | 'out';
    sourceUrl: string;
    sourceSite: string; // e.g., "Amnibus", "Anime Store JP"
    condition?: "new" | "used" | "refurbished";
    isSoldOut?: boolean;
    labels?: string[];
    // Detail/enrichment fields
    specs?: string[]; // parsed bullet points/specifications from detail page
    shippingSchedule?: string; // e.g., "late January 2026"
    reservationEndDate?: string; // ISO or human string
    preorderOpen?: boolean; // Now accepting reservations
    singlePriceJpy?: number;
    boxPriceJpy?: number;
    taxIncluded?: boolean;
    
    // Metadata
    scrapedAt: Timestamp;
    lastUpdated: Timestamp;
    scrapingJobId?: string;
    isActive: boolean; // False if product no longer exists on source site
}

export interface ScrapingJob {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    sourceSite: string;
    sourceUrl: string;
    startPage: number;
    endPage: number;
    
    // Results
    productsScraped: number;
    productsAdded: number;
    productsUpdated: number;
    errorMessage?: string;
    
    // Timestamps
    startedAt: Timestamp;
    completedAt?: Timestamp;
    
    // Metadata
    triggeredBy: 'cron' | 'manual' | 'api';
    duration?: number; // in seconds
}

// Collection names
const SCRAPED_PRODUCTS_COLLECTION = 'scrapedProducts';
const SCRAPING_JOBS_COLLECTION = 'scrapingJobs';

/**
 * Save a single scraped product to Firestore
 */
export async function saveScrapedProduct(product: Omit<ScrapedProductDB, 'id' | 'scrapedAt' | 'lastUpdated' | 'isActive'>): Promise<string> {
    try {
        // Generate a unique ID based on source URL and title
        const productId = generateProductId(product.sourceUrl, product.title);
        
        const productData: ScrapedProductDB = {
            ...product,
            id: productId,
            scrapedAt: Timestamp.now(),
            lastUpdated: Timestamp.now(),
            isActive: true,
        };

        await setDoc(doc(db, SCRAPED_PRODUCTS_COLLECTION, productId), productData, { merge: true });
        
        console.log(`✅ Saved product to Firestore: ${productId}`);
        return productId;
    } catch (error) {
        console.error('Error saving product to Firestore:', error);
        throw error;
    }
}

/**
 * Save multiple scraped products in a batch
 */
export async function saveScrapedProductsBatch(
    products: Omit<ScrapedProductDB, 'id' | 'scrapedAt' | 'lastUpdated' | 'isActive'>[],
    jobId?: string
): Promise<{ added: number; updated: number }> {
    try {
        const batch = writeBatch(db);
        let added = 0;
        let updated = 0;

        for (const product of products) {
            const productId = generateProductId(product.sourceUrl, product.title);
            const productRef = doc(db, SCRAPED_PRODUCTS_COLLECTION, productId);
            
            // Check if product already exists
            const existingProduct = await getDoc(productRef);
            
            const productData: ScrapedProductDB = {
                ...product,
                id: productId,
                scrapedAt: existingProduct.exists() ? existingProduct.data().scrapedAt : Timestamp.now(),
                lastUpdated: Timestamp.now(),
                isActive: true,
                scrapingJobId: jobId,
            };

            batch.set(productRef, productData, { merge: true });
            
            if (existingProduct.exists()) {
                updated++;
            } else {
                added++;
            }
        }

        await batch.commit();
        console.log(`✅ Batch saved ${products.length} products to Firestore (${added} new, ${updated} updated)`);
        
        return { added, updated };
    } catch (error) {
        console.error('Error saving products batch to Firestore:', error);
        throw error;
    }
}

/**
 * Get all scraped products
 */
export async function getAllScrapedProducts(
    filters?: {
        sourceSite?: string;
        availability?: 'in' | 'out';
        isActive?: boolean;
        limit?: number;
    }
): Promise<ScrapedProductDB[]> {
    try {
        // Simplified query without composite index requirement
        // Just get all products and filter in memory
        const q = query(collection(db, SCRAPED_PRODUCTS_COLLECTION));
        const querySnapshot = await getDocs(q);
        
        // Map to ensure id matches Firestore document ID
        let products = querySnapshot.docs.map(doc => {
            const data = doc.data() as ScrapedProductDB;
            return {
                ...data,
                id: doc.id, // Use Firestore document ID (p_xxxxx)
                originalId: data.id, // Preserve original product ID
            } as ScrapedProductDB;
        });
        
        // Apply filters in memory
        if (filters?.sourceSite) {
            products = products.filter(p => p.sourceSite === filters.sourceSite);
        }
        
        if (filters?.availability) {
            products = products.filter(p => p.availability === filters.availability);
        }
        
        if (filters?.isActive !== undefined) {
            products = products.filter(p => p.isActive === filters.isActive);
        }
        
        // Sort by scrapedAt descending
        products.sort((a, b) => {
            const timeA = a.scrapedAt?.toMillis() || 0;
            const timeB = b.scrapedAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        // Apply limit
        if (filters?.limit) {
            products = products.slice(0, filters.limit);
        }
        
        // Ensure id matches document ID
        products = products.map((p, index, arr) => {
            // Since we don't have document reference here, keep existing id
            return p;
        });
        
        return products;
    } catch (error) {
        console.error('Error getting scraped products from Firestore:', error);
        throw error;
    }
}

/**
 * Get a page of scraped products using cursor-based pagination.
 * Ordered by scrapedAt desc, then id desc for tie-breaker.
 */
export async function getScrapedProductsPage(limitCount: number = 48, cursor?: { ts: number; id: string }): Promise<{
    products: ScrapedProductDB[];
    nextCursor: { ts: number; id: string } | null;
}> {
    try {
        // Since scrapedAt is stored as ISO string (not Timestamp), we can't reliably order by it
        // Instead, order by id (descending) which is based on URL hash
        const constraints: QueryConstraint[] = [
            orderBy('id', 'desc'),
            limit(limitCount),
        ];

        if (cursor && cursor.id) {
            // Just use the ID for pagination
            constraints.push(startAfter(cursor.id));
        }

        const q = query(collection(db, SCRAPED_PRODUCTS_COLLECTION), ...constraints);
        const snap = await getDocs(q);

        // Map products and ensure the id field matches the Firestore document ID
        const products = snap.docs.map(d => {
            const data = d.data() as ScrapedProductDB;
            return {
                ...data,
                id: d.id, // Use Firestore document ID (p_xxxxx) instead of field id
                originalId: data.id, // Preserve original ID if needed
            } as ScrapedProductDB;
        });

        // Compute next cursor from last doc
        const lastDoc = snap.docs[snap.docs.length - 1];
        let nextCursor = null;
        
        if (lastDoc && snap.docs.length === limitCount) {
            // Only provide cursor if we got a full page (means there might be more)
            const lastData = lastDoc.data() as ScrapedProductDB;
            nextCursor = {
                ts: 0, // Not used anymore, but keep for compatibility
                id: lastData.id,
            };
        }

        return { products, nextCursor };
    } catch (error: any) {
        console.error('Error getting paginated products from Firestore:', error);
        
        // Simple fallback: get all and return first page
        try {
            const allQuery = query(collection(db, SCRAPED_PRODUCTS_COLLECTION), limit(limitCount));
            const snap = await getDocs(allQuery);
            const products = snap.docs.map(d => d.data() as ScrapedProductDB);
            return { products, nextCursor: null };
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw error;
        }
    }
}

/**
 * Get a single product by ID
 */
export async function getScrapedProductById(productId: string): Promise<ScrapedProductDB | null> {
    try {
        const docRef = doc(db, SCRAPED_PRODUCTS_COLLECTION, productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data() as ScrapedProductDB;
            // Ensure id matches Firestore document ID
            return {
                ...data,
                id: docSnap.id, // Use Firestore document ID (p_xxxxx)
                originalId: data.id, // Preserve original product ID
            } as ScrapedProductDB;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting product from Firestore:', error);
        throw error;
    }
}

/**
 * Delete a product
 */
export async function deleteScrapedProduct(productId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, SCRAPED_PRODUCTS_COLLECTION, productId));
        console.log(`✅ Deleted product: ${productId}`);
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

/**
 * Mark products as inactive (soft delete)
 */
export async function markProductsInactive(productIds: string[]): Promise<void> {
    try {
        const batch = writeBatch(db);
        
        for (const productId of productIds) {
            const productRef = doc(db, SCRAPED_PRODUCTS_COLLECTION, productId);
            batch.update(productRef, { isActive: false, lastUpdated: Timestamp.now() });
        }
        
        await batch.commit();
        console.log(`✅ Marked ${productIds.length} products as inactive`);
    } catch (error) {
        console.error('Error marking products inactive:', error);
        throw error;
    }
}

/**
 * Clear all scraped products (use with caution!)
 */
export async function clearAllScrapedProducts(): Promise<number> {
    try {
        const querySnapshot = await getDocs(collection(db, SCRAPED_PRODUCTS_COLLECTION));
        const batch = writeBatch(db);
        
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`✅ Cleared ${querySnapshot.size} products from Firestore`);
        
        return querySnapshot.size;
    } catch (error) {
        console.error('Error clearing products:', error);
        throw error;
    }
}

/**
 * Update/enrich a scraped product with detail fields
 */
export async function updateScrapedProductDetails(productId: string, updates: Partial<ScrapedProductDB>): Promise<void> {
    try {
        const ref = doc(db, SCRAPED_PRODUCTS_COLLECTION, productId);
        await updateDoc(ref, {
            ...updates,
            lastUpdated: Timestamp.now(),
        } as Record<string, unknown>);
        console.log(`✅ Enriched product ${productId} with detail fields`);
    } catch (error) {
        console.error('Error updating product details:', error);
        throw error;
    }
}

// ============================================================
// SCRAPING JOBS FUNCTIONS
// ============================================================

/**
 * Create a new scraping job
 */
export async function createScrapingJob(job: Omit<ScrapingJob, 'id' | 'startedAt' | 'status' | 'productsScraped' | 'productsAdded' | 'productsUpdated'>): Promise<string> {
    try {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const jobData: ScrapingJob = {
            ...job,
            id: jobId,
            status: 'pending',
            startedAt: Timestamp.now(),
            productsScraped: 0,
            productsAdded: 0,
            productsUpdated: 0,
        };

        await setDoc(doc(db, SCRAPING_JOBS_COLLECTION, jobId), jobData);
        console.log(`✅ Created scraping job: ${jobId}`);
        
        return jobId;
    } catch (error) {
        console.error('Error creating scraping job:', error);
        throw error;
    }
}

/**
 * Update scraping job status
 */
export async function updateScrapingJob(
    jobId: string, 
    updates: Partial<ScrapingJob>
): Promise<void> {
    try {
        const jobRef = doc(db, SCRAPING_JOBS_COLLECTION, jobId);
        await updateDoc(jobRef, updates as Record<string, unknown>);
        console.log(`✅ Updated scraping job: ${jobId}`);
    } catch (error) {
        console.error('Error updating scraping job:', error);
        throw error;
    }
}

/**
 * Get recent scraping jobs
 */
export async function getRecentScrapingJobs(limitCount: number = 10): Promise<ScrapingJob[]> {
    try {
        const q = query(
            collection(db, SCRAPING_JOBS_COLLECTION),
            orderBy('startedAt', 'desc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as ScrapingJob);
    } catch (error) {
        console.error('Error getting scraping jobs:', error);
        throw error;
    }
}

/**
 * Get a scraping job by ID
 */
export async function getScrapingJobById(jobId: string): Promise<ScrapingJob | null> {
    try {
        const docRef = doc(db, SCRAPING_JOBS_COLLECTION, jobId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as ScrapingJob;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting scraping job:', error);
        throw error;
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generate a consistent product ID from URL and title
 */
function generateProductId(sourceUrl: string, _title: string): string {
    // Create a stable, deterministic ID from the normalized URL
    // 1) Normalize URL (drop query/hash) so same product produces same ID across scrapes
    let normalized = sourceUrl;
    try {
        const u = new URL(sourceUrl);
        normalized = `${u.origin}${u.pathname}`.toLowerCase();
    } catch {
        normalized = sourceUrl.toLowerCase();
    }

    // 2) Simple fast hash (djb2 variant) -> base36 string
    let hash = 5381;
    for (let i = 0; i < normalized.length; i++) {
        hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
    }
    const id = Math.abs(hash >>> 0).toString(36);
    return `p_${id}`;
}

/**
 * Get statistics about scraped products
 */
export async function getScrapingStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    lastScrapedAt?: Date;
}> {
    try {
        const allProducts = await getAllScrapedProducts();
        const activeProducts = allProducts.filter(p => p.isActive);
        
        return {
            totalProducts: allProducts.length,
            activeProducts: activeProducts.length,
            inStockProducts: activeProducts.filter(p => p.availability === 'in').length,
            outOfStockProducts: activeProducts.filter(p => p.availability === 'out').length,
            lastScrapedAt: allProducts.length > 0 ? allProducts[0].scrapedAt.toDate() : undefined,
        };
    } catch (error) {
        console.error('Error getting scraping stats:', error);
        throw error;
    }
}

// ============================================================================
// ORDER MANAGEMENT FUNCTIONS
// ============================================================================

export interface OrderData {
    id?: string;
    // Customer Contact Information
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;

    // Delivery Information
    address: string;
    city: string;
    state: string;
    zipCode: string;

    // Order Details
    items: Array<{
        productId: string;
        title: string;
        price: number;
        quantity: number;
        imageUrl?: string;
        sourceUrl?: string;
    }>;
    subtotal: number;
    total: number;
    shippingFee?: number;

    // Payment Information
    paymentIntentId: string;
    paymentStatus: 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled';
    authorizedAmount?: number; // Amount authorized (product price only)
    capturedAmount?: number; // Final amount captured (product + shipping)

    // Order Status
    orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

    // Shipping Information
    trackingNumber?: string;
    shippingCarrier?: string;
    shippedAt?: Date;
    deliveredAt?: Date;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    newsletterOptIn: boolean;
}

/**
 * Create a new order with customer and delivery details
 */
export async function createOrder(orderData: Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const ordersRef = collection(db, 'orders');
        const newOrderData = {
            ...orderData,
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentStatus: 'authorized' as const,
            orderStatus: 'confirmed' as const,
            authorizedAmount: orderData.authorizedAmount || orderData.subtotal,
        };

        const docRef = await addDoc(ordersRef, newOrderData);

        console.log(`✅ Order created: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating order:', error);
        throw error;
    }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<OrderData | null> {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            const data = orderSnap.data();
            return {
                id: orderSnap.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as OrderData;
        }

        return null;
    } catch (error) {
        console.error('❌ Error getting order:', error);
        throw error;
    }
}

/**
 * Update order status (legacy function - use updateOrderStatuses instead)
 */
export async function updateOrderStatus(orderId: string, status: OrderData['orderStatus']): Promise<void> {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            orderStatus: status,
            updatedAt: new Date(),
        });

        console.log(`✅ Order ${orderId} status updated to: ${status}`);
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        throw error;
    }
}

/**
 * Update order statuses (both payment and order status)
 */
export async function updateOrderStatuses(
    orderId: string,
    updates: {
        orderStatus?: OrderData['orderStatus'];
        paymentStatus?: OrderData['paymentStatus'];
        trackingNumber?: string;
        shippingCarrier?: string;
        shippedAt?: Date;
        deliveredAt?: Date;
        capturedAmount?: number;
    }
): Promise<void> {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (updates.orderStatus) updateData.orderStatus = updates.orderStatus;
        if (updates.paymentStatus) updateData.paymentStatus = updates.paymentStatus;
        if (updates.trackingNumber) updateData.trackingNumber = updates.trackingNumber;
        if (updates.shippingCarrier) updateData.shippingCarrier = updates.shippingCarrier;
        if (updates.shippedAt) updateData.shippedAt = updates.shippedAt;
        if (updates.deliveredAt) updateData.deliveredAt = updates.deliveredAt;
        if (updates.capturedAmount) updateData.capturedAmount = updates.capturedAmount;

        await updateDoc(orderRef, updateData);

        console.log(`✅ Order ${orderId} statuses updated:`, updates);
    } catch (error) {
        console.error('❌ Error updating order statuses:', error);
        throw error;
    }
}

/**
 * Get all orders (for admin use)
 */
export async function getAllOrders(limitCount = 50): Promise<OrderData[]> {
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const orders: OrderData[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            orders.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as OrderData);
        });

        return orders;
    } catch (error) {
        console.error('❌ Error getting orders:', error);
        throw error;
    }
}
