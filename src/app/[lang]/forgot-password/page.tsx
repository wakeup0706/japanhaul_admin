"use client";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";
    const t = {
        en: { title: "Forgot password", email: "Email", submit: "Send reset link", success: "Reset link sent successfully!", error: "Error sending reset link" },
        ja: { title: "パスワードをお忘れですか", email: "メール", submit: "リセットリンクを送信", success: "リセットリンクが正常に送信されました！", error: "リセットリンクの送信エラー" },
    }[lang];

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: t.success });
                setEmail("");
            } else {
                setMessage({ type: 'error', text: data.error || t.error });
            }
        } catch {
            setMessage({ type: 'error', text: t.error });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-sm mx-auto px-4 py-14">
            <h1 className="text-2xl font-semibold mb-6">{t.title}</h1>

            {message && (
                <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
                <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border rounded p-3 w-full text-base"
                    placeholder={t.email}
                />
                <button
                    className="w-full bg-black text-white px-5 py-3 rounded text-base font-medium disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? '...' : t.submit}
                </button>
            </form>
        </section>
    );
}