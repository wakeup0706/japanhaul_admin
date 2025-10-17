"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, use } from "react";
import HeroCarousel from "@/app/_components/HeroCarousel";
import { getAllProducts, type Product, products as hardcodedProducts } from "@/app/_data/products";

export default function LocalizedHome({ params }: { params: Promise<{ lang: string }> }) {
    // Unwrap params Promise for Next.js 15
    const resolvedParams = use(params);

    // Debug logging to see what's in params
    console.log('🔍 Debug params:', resolvedParams);
    console.log('🔍 Debug params.lang:', resolvedParams?.lang, typeof resolvedParams?.lang);

    // Handle different possible param structures in Next.js 15
    let langParam = resolvedParams?.lang;

    // Handle case where lang might be an object with a value property
    if (typeof langParam === 'object' && langParam !== null && 'value' in langParam) {
        langParam = (langParam as { value: string }).value;
    }

    // Ensure lang is a valid string
    const lang = (typeof langParam === 'string' && (langParam === "ja" || langParam === "en"))
        ? langParam
        : "en";

    console.log('🔍 Final lang value:', lang, typeof lang);

    // State for products - start with dummy data, then fetch real data
    const [products, setProducts] = useState<Product[]>(hardcodedProducts.slice(0, 8));

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                console.log('🔄 Fetching real products for home page...');
                const realProducts = await getAllProducts(8);
                console.log('✅ Received real products:', realProducts.length);
                if (realProducts.length > 0) {
                    setProducts(realProducts);
                    console.log('✅ Updated home page with real products');
                }
            } catch (error) {
                console.error('❌ Failed to fetch real products for home page:', error);
                // Keep using dummy products as fallback
            }
        };

        fetchProducts();
    }, []);

    return (
        <section>
            {/* Hero Carousel */}
            <div className="w-full px-6 lg:px-10 py-8 mb-6">
                <HeroCarousel lang={lang} />
            </div>

            {/* Product grid with SSR data + client-side fallback */}
            <div className="w-full px-6 lg:px-10 py-8">
                {products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <Link key={product.id} href={`/${lang}/products/${product.id}`} className="group block">
                                <div className="aspect-square overflow-hidden rounded-lg border bg-white group-hover:shadow-sm transition">
                                    <Image
                                        src={product.imageUrl || "/placeholder.jpg"}
                                        alt={product.title}
                                        width={600}
                                        height={600}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="mt-2 text-sm leading-tight">
                                    <div className="font-bold group-hover:underline line-clamp-2">{product.title}</div>
                                    <div className="mt-0.5 text-[13px]">
                                        <span className="font-semibold text-black">${product.price.toFixed(2)} USD</span>
                                        {product.compareAt && (
                                            <span className="ml-2 text-gray-500 line-through text-xs">
                                                ${product.compareAt.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    {product.availability === 'out' && (
                                        <div className="mt-1 text-xs text-red-600 font-medium">Out of Stock</div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">No products available</div>
                        <Link href={`/${lang}/products`} className="text-blue-600 hover:text-blue-800 font-medium">
                            View all products →
                        </Link>
                    </div>
                )}
            </div>

            {/* Client-side fallback script */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        if (typeof window !== 'undefined' && document.querySelector('.grid')) {
                            const productsGrid = document.querySelector('.grid');
                            if (productsGrid && productsGrid.children.length === 0) {
                                console.log('🔄 Client-side: No products found, attempting fallback...');
                                fetch('/api/products/db?limit=8&lang=${lang}')
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.products && data.products.length > 0) {
                                            console.log('✅ Client-side: Found products, would update DOM');
                                            // In a real implementation, you would update the DOM here
                                        }
                                    })
                                    .catch(error => console.error('❌ Client-side fallback failed:', error));
                            }
                        }
                    `
                }}
            />
        </section>
    );
}
