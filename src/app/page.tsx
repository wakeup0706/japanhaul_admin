"use client";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">JapanHaul</h1>
        <p className="text-gray-600 mb-8">Bringing Japan to your doorstep</p>
        <div className="space-x-4">
          <a href="/en" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Shop Now (English)
          </a>
          <a href="/ja" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
            今すぐ購入 (日本語)
          </a>
        </div>
      </div>
    </div>
  );
}
