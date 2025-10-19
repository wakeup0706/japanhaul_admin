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
    price: number; // Price in JPY (scraped amount)
    displayPrice?: number; // Price with 20% markup (1200 yen for 1000 yen scraped)
    originalPrice?: number; // Original scraped price before markup
    brand: string;
    category: string;
    imageUrl?: string;
    images?: string[]; // gallery images from detail page
    description?: string;
    availability: 'in' | 'out' | 'preorder';
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
        availability?: 'in' | 'out' | 'preorder';
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
        console.log('📄 Fetching products page:', { limitCount, cursor });
        
        const collectionRef = collection(db, SCRAPED_PRODUCTS_COLLECTION);
        
        // Build query with pagination
        let q;
        if (cursor && cursor.id) {
            console.log('🔄 Using cursor to fetch next page, starting after ID:', cursor.id);
            
            // CRITICAL: We need to fetch the cursor document first to use as startAfter reference
            const cursorDocRef = doc(db, SCRAPED_PRODUCTS_COLLECTION, cursor.id);
            const cursorDocSnap = await getDoc(cursorDocRef);
            
            if (!cursorDocSnap.exists()) {
                console.error('❌ Cursor document not found:', cursor.id);
                // Start from beginning if cursor is invalid
                q = query(collectionRef, orderBy('id', 'desc'), limit(limitCount));
            } else {
                // Use the document snapshot for startAfter
                q = query(
                    collectionRef,
                    orderBy('id', 'desc'),
                    startAfter(cursorDocSnap),
                    limit(limitCount)
                );
            }
        } else {
            console.log('📋 Fetching first page');
            q = query(collectionRef, orderBy('id', 'desc'), limit(limitCount));
        }

        const snap = await getDocs(q);
        console.log('✅ Fetched products:', snap.docs.length, 
            'First ID:', snap.docs[0]?.id, 
            'Last ID:', snap.docs[snap.docs.length - 1]?.id);

        // Map products
        const products = snap.docs.map(d => {
            const data = d.data() as ScrapedProductDB;
            return {
                ...data,
                id: d.id, // Use Firestore document ID
            } as ScrapedProductDB;
        });

        // Compute next cursor
        let nextCursor = null;
        const lastDoc = snap.docs[snap.docs.length - 1];
        
        if (lastDoc && snap.docs.length === limitCount) {
            // Full page means there might be more
            nextCursor = {
                ts: 0, // Not used anymore
                id: lastDoc.id,
            };
            console.log('📍 Next cursor will be:', lastDoc.id);
        } else {
            console.log('🏁 Last page reached (got', snap.docs.length, 'of', limitCount, 'requested)');
        }

        return { products, nextCursor };
    } catch (error: any) {
        console.error('❌ Error getting paginated products from Firestore:', error);
        
        // Fallback: get first page without cursor
        try {
            const allQuery = query(
                collection(db, SCRAPED_PRODUCTS_COLLECTION), 
                orderBy('id', 'desc'),
                limit(limitCount)
            );
            const snap = await getDocs(allQuery);
            const products = snap.docs.map(d => ({
                ...d.data(),
                id: d.id,
            } as ScrapedProductDB));
            return { products, nextCursor: null };
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
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
// ADMIN USER MANAGEMENT FUNCTIONS
// ============================================================

export interface AdminUser {
    id: string;
    uid: string;
    email: string;
    name?: string;
    role: 'super_admin' | 'admin' | 'general' | 'test_mode';
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
}

/**
 * Create or update admin user
 */
export async function upsertAdminUser(adminUser: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const adminUsersRef = collection(db, 'adminUsers');
        const adminUserData = {
            ...adminUser,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Check if user already exists
        const existingQuery = query(adminUsersRef, where('uid', '==', adminUser.uid));
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
            // Update existing user
            const existingDoc = existingSnapshot.docs[0];
            await updateDoc(existingDoc.ref, {
                ...adminUserData,
                createdAt: existingDoc.data().createdAt, // Preserve original creation date
            });
            console.log(`✅ Updated admin user: ${adminUser.uid}`);
            return existingDoc.id;
        } else {
            // Create new user
            const docRef = await addDoc(adminUsersRef, adminUserData);
            console.log(`✅ Created admin user: ${adminUser.uid}`);
            return docRef.id;
        }
    } catch (error) {
        console.error('❌ Error upserting admin user:', error);
        throw error;
    }
}

/**
 * Get admin user by UID
 */
export async function getAdminUserByUID(uid: string): Promise<AdminUser | null> {
    try {
        const adminUsersRef = collection(db, 'adminUsers');
        const q = query(adminUsersRef, where('uid', '==', uid), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as AdminUser;
        }

        return null;
    } catch (error) {
        console.error('❌ Error getting admin user:', error);
        throw error;
    }
}

/**
 * Get all admin users
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
    try {
        const adminUsersRef = collection(db, 'adminUsers');
        const q = query(adminUsersRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as AdminUser;
        });
    } catch (error) {
        console.error('❌ Error getting admin users:', error);
        throw error;
    }
}

/**
 * Delete admin user (soft delete)
 */
export async function deleteAdminUser(uid: string): Promise<void> {
    try {
        const adminUsersRef = collection(db, 'adminUsers');
        const q = query(adminUsersRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            await updateDoc(doc.ref, {
                isActive: false,
                updatedAt: new Date(),
            });
            console.log(`✅ Soft deleted admin user: ${uid}`);
        }
    } catch (error) {
        console.error('❌ Error deleting admin user:', error);
        throw error;
    }
}

/**
 * Get default permissions for each role
 */
export function getRolePermissions(role: AdminUser['role']): string[] {
    switch (role) {
        case 'super_admin':
            return [
                'admin.login',
                'admin.list.edit',
                'admin.permissions.edit',
                'products.view',
                'products.edit',
                'products.delete',
                'products.popularity.view',
                'orders.view',
                'orders.edit',
                'orders.capture',
                'customers.view',
                'analytics.view',
                'analytics.export',
                'analytics.profit.view',
                'system.settings'
            ];
        case 'admin':
            return [
                'admin.login',
                'admin.list.view',
                'products.view',
                'products.edit',
                'products.popularity.view',
                'orders.view',
                'orders.edit',
                'orders.capture',
                'customers.view',
                'analytics.view',
                'analytics.profit.view'
            ];
        case 'general':
            return [
                'admin.login',
                'products.view',
                'products.popularity.view',
                'orders.view',
                'customers.view',
                'analytics.view'
            ];
        case 'test_mode':
            return [
                'admin.login',
                'products.view'
            ];
        default:
            return [];
    }
}

// Permission matrix configuration for UI display
export interface PermissionMatrixItem {
    function: string;
    displayName: string;
    description: string;
    super_admin: boolean;
    admin: boolean;
    general: boolean;
    test_mode: boolean;
}

export function getPermissionMatrix(): PermissionMatrixItem[] {
    return [
        {
            function: 'admin.login',
            displayName: 'Login',
            description: 'Can log into the admin system',
            super_admin: true,
            admin: true,
            general: true,
            test_mode: true
        },
        {
            function: 'admin.list.edit',
            displayName: 'Admin List Editing',
            description: 'Can edit admin user lists',
            super_admin: true,
            admin: true,
            general: false,
            test_mode: false
        },
        {
            function: 'admin.permissions.edit',
            displayName: 'Admin Permission Editing',
            description: 'Can edit admin user permissions and roles',
            super_admin: true,
            admin: false,
            general: false,
            test_mode: false
        },
        {
            function: 'products.view',
            displayName: 'View Product Information',
            description: 'Can view product details and listings',
            super_admin: true,
            admin: true,
            general: true,
            test_mode: true
        },
        {
            function: 'products.edit',
            displayName: 'Edit Products',
            description: 'Can edit product information',
            super_admin: true,
            admin: true,
            general: false,
            test_mode: false
        },
        {
            function: 'products.delete',
            displayName: 'Delete Products',
            description: 'Can delete products',
            super_admin: true,
            admin: false,
            general: false,
            test_mode: false
        },
        {
            function: 'products.popularity.view',
            displayName: 'Display by Popularity',
            description: 'Can view and sort products by popularity metrics',
            super_admin: true,
            admin: true,
            general: true,
            test_mode: false
        },
        {
            function: 'orders.view',
            displayName: 'Purchase History',
            description: 'Can view order and purchase history',
            super_admin: true,
            admin: true,
            general: true,
            test_mode: false
        },
        {
            function: 'orders.edit',
            displayName: 'Edit Orders',
            description: 'Can edit order information',
            super_admin: true,
            admin: true,
            general: false,
            test_mode: false
        },
        {
            function: 'orders.capture',
            displayName: 'Capture Orders',
            description: 'Can capture/process orders',
            super_admin: true,
            admin: true,
            general: false,
            test_mode: false
        },
        {
            function: 'customers.view',
            displayName: 'Customer List',
            description: 'Can view customer information and lists',
            super_admin: true,
            admin: true,
            general: true,
            test_mode: false
        },
        {
            function: 'analytics.view',
            displayName: 'View Analytics',
            description: 'Can view analytics dashboard',
            super_admin: true,
            admin: true,
            general: true,
            test_mode: false
        },
        {
            function: 'analytics.export',
            displayName: 'Export Analytics',
            description: 'Can export analytics data',
            super_admin: true,
            admin: false,
            general: false,
            test_mode: false
        },
        {
            function: 'analytics.profit.view',
            displayName: 'Profit Management',
            description: 'Can view profit analytics and management reports',
            super_admin: true,
            admin: true,
            general: false,
            test_mode: false
        },
        {
            function: 'system.settings',
            displayName: 'System Settings',
            description: 'Can access system settings',
            super_admin: true,
            admin: false,
            general: false,
            test_mode: false
        }
    ];
}

// ============================================================
// PRICING UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate display price with 20% markup
 */
export function calculateDisplayPrice(scrapedPrice: number): number {
    return Math.round(scrapedPrice * 1.2); // 20% markup
}

/**
 * Calculate price with markup for multiple items
 */
export function calculateSubtotalWithMarkup(items: Array<{price: number, quantity: number}>): number {
    return items.reduce((total, item) => total + (calculateDisplayPrice(item.price) * item.quantity), 0);
}

/**
 * Calculate original subtotal (without markup)
 */
export function calculateOriginalSubtotal(items: Array<{price: number, quantity: number}>): number {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}


/**
 * Initialize default admin users if none exist
 * This should be called during first-time setup or deployment
 */
export async function initializeDefaultAdminUsers(): Promise<void> {
    try {
        const existingUsers = await getAllAdminUsers();

        if (existingUsers.length === 0) {
            console.log('🔧 No admin users found. Creating default super admin...');

            // Create a default super admin
            // Note: In a real application, you might want to create this through environment variables
            // or a secure setup process rather than hardcoded values
            const defaultAdmin = {
                uid: 'default-super-admin-uid', // This should be replaced with actual Firebase Auth UID
                email: 'admin@yourdomain.com', // Replace with your actual admin email
                name: 'Default Super Admin',
                role: 'super_admin' as const,
                permissions: getRolePermissions('super_admin'),
                isActive: true,
            };

            await upsertAdminUser(defaultAdmin);
            console.log('✅ Default super admin created successfully');
        } else {
            console.log(`✅ Found ${existingUsers.length} existing admin users`);
        }
    } catch (error) {
        console.error('❌ Error initializing default admin users:', error);
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
        price: number; // Display price in JPY (with markup)
        originalPrice: number; // Original scraped price in JPY
        quantity: number;
        imageUrl?: string;
        sourceUrl?: string;
    }>;
    subtotal: number; // Subtotal with markup in JPY
    originalSubtotal: number; // Subtotal without markup in JPY
    total: number; // Final total in JPY (subtotal + shipping)
    shippingFee?: number; // Shipping fee in JPY

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
 * Update order shipping fee and recalculate total
 */
export async function updateOrderShippingFee(orderId: string, shippingFee: number): Promise<string> {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            throw new Error('Order not found');
        }

        const orderData = orderSnap.data() as OrderData;
        const newTotal = orderData.subtotal + shippingFee;

        await updateDoc(orderRef, {
            shippingFee,
            total: newTotal,
            updatedAt: new Date(),
        });

        console.log(`✅ Order ${orderId} shipping fee updated to: $${shippingFee}, total: $${newTotal}`);
        return orderId;
    } catch (error) {
        console.error('❌ Error updating order shipping fee:', error);
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
