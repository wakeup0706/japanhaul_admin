"use client";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();

    const lang = rawLang === "ja" ? "ja" : "en";
    const t = {
        en: {
            title: "Reset Password",
            newPassword: "New Password",
            confirmPassword: "Confirm Password",
            submit: "Reset Password",
            passwordMismatch: "Passwords do not match",
            success: "Password reset successfully!",
            error: "Error resetting password"
        },
        ja: {
            title: "パスワードリセット",
            newPassword: "新しいパスワード",
            confirmPassword: "パスワード確認",
            submit: "パスワードをリセット",
            passwordMismatch: "パスワードが一致しません",
            success: "パスワードが正常にリセットされました！",
            error: "パスワードリセットエラー"
        },
    }[lang];

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    useEffect(() => {
        if (mode !== 'resetPassword' || !oobCode) {
            router.push(`/${lang}/login?error=InvalidResetLink`);
        }
    }, [mode, oobCode, router, lang]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: t.passwordMismatch });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/auth/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    oobCode,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: t.success });
                setTimeout(() => {
                    router.push(`/${lang}/login?message=PasswordReset`);
                }, 2000);
            } else {
                setMessage({ type: 'error', text: data.error || t.error });
            }
        } catch {
            setMessage({ type: 'error', text: t.error });
        } finally {
            setLoading(false);
        }
    };

    if (mode !== 'resetPassword' || !oobCode) {
        return null; // Will redirect in useEffect
    }

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
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="border rounded p-3 w-full text-base"
                    placeholder={t.newPassword}
                />
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border rounded p-3 w-full text-base"
                    placeholder={t.confirmPassword}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white px-5 py-3 rounded text-base font-medium disabled:opacity-50"
                >
                    {loading ? '...' : t.submit}
                </button>
            </form>
        </section>
    );
}
