import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('id');
    const max = Number(searchParams.get('limit') || '12');
    if (!productId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Fetch related products from subcollection
    const relatedRef = collection(db, `scrapedProducts/${productId}/related`);
    const relatedSnap = await getDocs(relatedRef);
    
    // Transform to simple array format
    const relatedProducts = relatedSnap.docs.map(doc => {
      const data = doc.data();
      
      // Extract correct numeric ID from document ID or data
      let correctProductId = doc.id.replace('related_', '');
      if (data.id) {
        correctProductId = data.id.toString();
      }
      
      // Apply 20% markup to scraped products
      let displayPrice = data.price || 0;
      if (data.url && data.url.includes('scraped')) {
        displayPrice = Math.round(displayPrice * 1.2); // 20% markup
      }
      
      return {
        id: correctProductId,
        imageUrl: data.imageUrl || '',
        price: displayPrice,
        scrapedAt: data.scrapedAt || new Date().toISOString(),
        title: data.title || '',
        url: data.url || data.sourceUrl || ''
      };
    });
    
    // Apply limit
    const limitedProducts = relatedProducts.slice(0, Math.max(1, Math.min(max, 48)));
    
    return NextResponse.json(limitedProducts);
  } catch (e) {
    console.error('Related fetch failed', e);
    return NextResponse.json({ error: 'Failed to fetch related' }, { status: 500 });
  }
}
