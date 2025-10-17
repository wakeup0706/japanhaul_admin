"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AccountPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const router = useRouter();
    const lang = rawLang === "ja" ? "ja" : "en";

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form states
    const [displayName, setDisplayName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const t = {
        en: {
            title: "Account Settings",
            welcome: "Welcome back",
            email: "Email",
            displayName: "Display Name",
            updateProfile: "Update Profile",
            changePassword: "Change Password",
            currentPassword: "Current Password",
            newPassword: "New Password",
            confirmPassword: "Confirm New Password",
            saveChanges: "Save Changes",
            passwordMismatch: "New passwords do not match",
            passwordTooShort: "Password must be at least 6 characters",
            profileUpdated: "Profile updated successfully",
            passwordUpdated: "Password updated successfully",
            updateError: "Failed to update",
            notLoggedIn: "You must be logged in to view this page",
            login: "Log in"
        },
        ja: {
            title: "アカウント設定",
            welcome: "おかえりなさい",
            email: "メール",
            displayName: "表示名",
            updateProfile: "プロフィールを更新",
            changePassword: "パスワードを変更",
            currentPassword: "現在のパスワード",
            newPassword: "新しいパスワード",
            confirmPassword: "新しいパスワード確認",
            saveChanges: "変更を保存",
            passwordMismatch: "新しいパスワードが一致しません",
            passwordTooShort: "パスワードは6文字以上でなければなりません",
            profileUpdated: "プロフィールが正常に更新されました",
            passwordUpdated: "パスワードが正常に更新されました",
            updateError: "更新に失敗しました",
            notLoggedIn: "このページを表示するにはログインが必要です",
            login: "ログイン"
        }
    }[lang];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
                setDisplayName(user.displayName || "");
            } else {
                setUser(null);
                router.push(`/${lang}/login`);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [lang, router]);

    const handleUpdateProfile = async () => {
        if (!user) return;

        setUpdating(true);
        setMessage(null);

        try {
            await updateProfile(user, {
                displayName: displayName
            });
            setMessage({ type: 'success', text: t.profileUpdated });
        } catch (error) {
            console.error('Profile update error:', error);
            setMessage({ type: 'error', text: t.updateError });
        } finally {
            setUpdating(false);
        }
    };

    const handleChangePassword = async () => {
        if (!user || !newPassword || !currentPassword) return;

        // Validate passwords
        if (newPassword !== confirmNewPassword) {
            setMessage({ type: 'error', text: t.passwordMismatch });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: t.passwordTooShort });
            return;
        }

        setUpdating(true);
        setMessage(null);

        try {
            // Reauthenticate user with current password
            const credential = EmailAuthProvider.credential(user.email!, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");

            setMessage({ type: 'success', text: t.passwordUpdated });
        } catch (error) {
            console.error('Password update error:', error);

            let errorMessage = t.updateError;
            if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
                const firebaseError = error as { code: string };
                if (firebaseError.code === 'auth/wrong-password') {
                    errorMessage = lang === 'ja' ? '現在のパスワードが正しくありません。' : 'Current password is incorrect.';
                } else if (firebaseError.code === 'auth/weak-password') {
                    errorMessage = lang === 'ja' ? '新しいパスワードが弱すぎます。' : 'New password is too weak.';
                }
            }

            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <section className="max-w-2xl mx-auto px-4 py-14">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="mt-2 text-gray-600">{lang === 'ja' ? '読み込み中...' : 'Loading...'}</p>
                </div>
            </section>
        );
    }

    if (!user) {
        return (
            <section className="max-w-2xl mx-auto px-4 py-14">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold mb-4">{t.notLoggedIn}</h1>
                    <a href={`/${lang}/login`} className="inline-block bg-black text-white px-6 py-3 rounded text-base font-medium hover:bg-gray-800">
                        {t.login}
                    </a>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-2xl mx-auto px-4 py-14">
            <h1 className="text-2xl font-semibold mb-6">{t.title}</h1>

            {message && (
                <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h2 className="text-lg font-medium mb-4">{t.welcome}, {user.displayName || user.email?.split('@')[0]}!</h2>
                <div className="space-y-2">
                    <p><span className="font-medium">{t.email}:</span> {user.email}</p>
                    <p><span className="font-medium">{t.displayName}:</span> {user.displayName || (lang === 'ja' ? '設定されていません' : 'Not set')}</p>
                </div>
            </div>

            {/* Profile Update */}
            <div className="bg-white border rounded-lg p-6 mb-8">
                <h3 className="text-lg font-medium mb-4">{t.updateProfile}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.displayName}</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full border rounded p-3 text-base"
                            placeholder={t.displayName}
                        />
                    </div>
                    <button
                        onClick={handleUpdateProfile}
                        disabled={updating}
                        className="bg-black text-white px-6 py-3 rounded text-base font-medium disabled:opacity-50 hover:bg-gray-800"
                    >
                        {updating ? (lang === 'ja' ? '更新中...' : 'Updating...') : t.saveChanges}
                    </button>
                </div>
            </div>

            {/* Password Change */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">{t.changePassword}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.currentPassword}</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full border rounded p-3 text-base"
                            placeholder={t.currentPassword}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.newPassword}</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full border rounded p-3 text-base"
                            placeholder={t.newPassword}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.confirmPassword}</label>
                        <input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="w-full border rounded p-3 text-base"
                            placeholder={t.confirmPassword}
                        />
                    </div>
                    <button
                        onClick={handleChangePassword}
                        disabled={updating || !currentPassword || !newPassword || !confirmNewPassword}
                        className="bg-black text-white px-6 py-3 rounded text-base font-medium disabled:opacity-50 hover:bg-gray-800"
                    >
                        {updating ? (lang === 'ja' ? '更新中...' : 'Updating...') : t.saveChanges}
                    </button>
                </div>
            </div>
        </section>
    );
}
