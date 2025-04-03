"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function StudentSettingsPage() {
    const { t } = useTranslation();
    const { user, token, apiUrl, refreshUser } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // State to trigger refresh only once after redirect
    const [needsRefresh, setNeedsRefresh] = useState(true);

    // --- TEMPORARY WORKAROUND for data loading issue after redirect ---
    // This useEffect forces a page reload 0.5s after the component mounts
    // if the `needsRefresh` flag is true. This is NOT an ideal solution
    // and should be replaced by fixing the underlying state hydration or
    // data fetching synchronization issue in AuthProvider or this page.
    useEffect(() => {
        if (needsRefresh) {
            const timer = setTimeout(() => {
                console.log("Attempting page refresh as a workaround...");
                setNeedsRefresh(false); // Prevent infinite loops
                window.location.reload();
            }, 500); // 0.5 second delay

            // Cleanup the timer if the component unmounts before refresh
            return () => clearTimeout(timer);
        }
    }, [needsRefresh]); // Run only when needsRefresh changes (initially true)
    // ---------------- End of Temporary Workaround --------------------

    useEffect(() => {
        if (user) {
            // If user data is available, no need to force refresh anymore
            // This might prevent unnecessary refreshes if data arrives quickly
            // *after* the refresh timer has started but *before* it executes.
            if (user.first_name || user.last_name) { 
                setNeedsRefresh(false);
            }
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
        }
    }, [user]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setNeedsRefresh(false); // Don't refresh after manual interaction

        if (!token) {
            setError(t('settings.error.notAuthenticated'));
            setIsLoading(false);
            toast.error(t('settings.error.notAuthenticated'));
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/auth/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ first_name: firstName, last_name: lastName }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                 throw new Error(responseData.message || responseData.detail || t('settings.error.updateFailed'));
            }

            console.log('Update successful:', responseData);

            if (refreshUser) {
                 await refreshUser();
            }

            toast.success(t('settings.success.updateMessage'));

        } catch (err) {
            console.error("Failed to update profile:", err);
            const errorMessage = err instanceof Error ? err.message : t('settings.error.updateFailed');
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading indicator based on user data OR if a refresh is pending
    if (!user || (needsRefresh && !firstName && !lastName)) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                {/* Provide a generic loading message while potentially waiting for refresh */}
                <span className="ml-2">{t('loading', 'Loading...')}</span> 
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg">
            <Toaster position="top-center" reverseOrder={false} />
            <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings.label.firstName')}
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={firstName}
                        onChange={(e) => {
                            setFirstName(e.target.value);
                            setNeedsRefresh(false); // Stop refresh attempt if user starts typing
                         }}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings.label.lastName')}
                    </label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={lastName}
                        onChange={(e) => {
                            setLastName(e.target.value);
                            setNeedsRefresh(false); // Stop refresh attempt if user starts typing
                        }}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        disabled={isLoading}
                    />
                </div>

                 {error && (
                    <div className="p-3 border border-red-500 bg-red-50 rounded-md text-red-700 flex items-center text-sm">
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {t('settings.button.save')}
                    </button>
                </div>
            </form>
        </div>
    );
} 