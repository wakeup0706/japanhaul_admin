"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Slide {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaLink: string;
  badge?: string;
  discount?: string;
}

interface HeroCarouselProps {
  lang: "en" | "ja";
}

export default function HeroCarousel({ lang }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const mainSlides: Slide[] = [
    {
      id: "hero-1",
      image: "/hero_1.jpg",
      title: "30% Off Sitewide!",
      subtitle: "Limited Time Sale!",
      ctaText: "Shop Now",
      ctaLink: `/${lang}/products`,
      badge: "Limited Time Sale!",
      discount: "30% OFF"
    },
    {
      id: "hero-2",
      image: "/hero_2.jpg",
      title: "Pokemon Halloween Collection",
      subtitle: "Limited Quantity",
      ctaText: "View Collection",
      ctaLink: `/${lang}/products?category=pokemon`,
      badge: "Limited Quantity"
    },
    {
      id: "hero-3",
      image: "/hero_3.jpg",
      title: "Starbucks Tsukimi Collection",
      subtitle: "Limited Quantity",
      ctaText: "View Collection",
      ctaLink: `/${lang}/products?category=starbucks`,
      badge: "Limited Quantity"
    }
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mainSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, mainSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of manual interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % mainSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + mainSlides.length) % mainSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Main Hero Slide - Takes up 4 columns (much wider) */}
        <div className="lg:col-span-4 relative">
          <div className="relative h-[500px] lg:h-[650px] overflow-hidden rounded-2xl">
            <div className="relative h-full w-full">
              {mainSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center">
                    <div className="p-6 sm:p-8 md:p-12 text-white max-w-lg">
                      {slide.badge && (
                        <div className="inline-block bg-red-500 text-white text-xs px-3 py-1 rounded-full mb-4">
                          {slide.badge}
                        </div>
                      )}
                      {slide.discount && (
                        <div className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                          {slide.discount}
                        </div>
                      )}
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                        {slide.title}
                      </h1>
                      {slide.subtitle && (
                        <p className="text-lg mb-6 opacity-90">
                          {slide.subtitle}
                        </p>
                      )}
                      <Link
                        href={slide.ctaLink}
                        className="inline-block bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                      >
                        {slide.ctaText}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {mainSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? "bg-white" : "bg-white/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Second Column - Two rows: Pokemon (top) and Starbucks (bottom) */}
        <div className="lg:col-span-2 space-y-3 lg:space-y-4">
          {/* Pokemon Halloween Collection */}
          <div className="relative h-[325px] lg:h-[325px] overflow-hidden rounded-2xl">
            <Image
              src="/hero_2.jpg"
              alt="Pokemon Halloween Collection"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded">
                Limited Quantity
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white p-4">
                <h2 className="text-xl lg:text-2xl font-bold mb-1">Pokemon Halloween</h2>
                <h3 className="text-lg lg:text-xl font-semibold mb-3">Collection</h3>
                <Link
                  href={`/${lang}/products?category=pokemon`}
                  className="inline-block bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm"
                >
                  View Collection
                </Link>
              </div>
            </div>
          </div>

          {/* Starbucks Tsukimi Collection */}
          <div className="relative h-[325px] lg:h-[325px] overflow-hidden rounded-2xl">
            <Image
              src="/hero_3.jpg"
              alt="Starbucks Tsukimi Collection"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="inline-block bg-emerald-500 text-white text-xs px-2 py-1 rounded">
                Limited Quantity
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white p-4">
                <h2 className="text-xl lg:text-2xl font-bold mb-1">Starbucks Tsukimi</h2>
                <h3 className="text-lg lg:text-xl font-semibold mb-3">Collection</h3>
                <Link
                  href={`/${lang}/products?category=starbucks`}
                  className="inline-block bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm"
                >
                  View Collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row with three promotional sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-6">
        {/* Viral Products Section */}
        <div className="relative h-[220px] lg:h-[260px] overflow-hidden rounded-2xl group cursor-pointer">
          <Image
            src="/promo_1.jpg"
            alt="Viral Japanese products"
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <p className="text-sm leading-tight">
              🚀 Dive into the most viral Japanese products of the week!
            </p>
          </div>
        </div>

        {/* Exclusive Merch Section */}
        <div className="relative h-[220px] lg:h-[260px] overflow-hidden rounded-2xl group cursor-pointer">
          <Image
            src="/promo_2.jpg"
            alt="Exclusive merch"
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <p className="text-sm leading-tight">
              ✨ Get your hands on the latest exclusive merch
            </p>
          </div>
        </div>

        {/* Deals Section */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-4 text-white h-[220px] lg:h-[260px] flex flex-col justify-center">
          <h3 className="font-semibold mb-2 text-base lg:text-lg">Checkout the best deals</h3>
          <p className="text-sm opacity-90 mb-3 lg:mb-4">only from JapanHaul</p>
          <Link
            href={`/${lang}/products`}
            className="inline-block bg-white text-orange-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors self-start"
          >
            Shop Deals
          </Link>
        </div>
      </div>
    </div>
  );
}
