"use client";

import { useEffect, useState } from "react";

export default function PromoBar() {
    const [currentIndex, setCurrentIndex] = useState(0);

    const messages = [
        "We're still shipping to the U.S as usual via private carriers",
        "Use Code LAUNCH30 to get 30% Off!",
        "Preorder Now & Save 20% OFF Japanese Advent Calendars!"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % messages.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [messages.length]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
    };

    return (
        <div className="bg-red-600 text-white">
            <div className="w-full px-4 py-3">
                <div className="flex items-center justify-center gap-4">
                    {/* Previous Arrow */}
                    <button
                        onClick={goToPrevious}
                        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                        aria-label="Previous message"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {/* Message Content */}
                    <div className="flex-1 text-center">
                        <div className="relative h-5 overflow-hidden">
                            <div
                                key={currentIndex}
                                className="animate-[fadeSlide_400ms_ease] absolute inset-0 flex items-center justify-center"
                            >
                                <span className="text-sm font-medium px-2">
                                    {messages[currentIndex]}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Next Arrow */}
                    <button
                        onClick={goToNext}
                        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                        aria-label="Next message"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeSlide {
                    0% { opacity: 0; transform: translateY(6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
