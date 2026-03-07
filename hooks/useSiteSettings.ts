"use client";

import { useState, useEffect } from "react";

export interface ClientSiteSettings {
    siteName: string;
    siteTagline: string;
    siteDescription: string;
    siteUrl: string;
    logo: string;
    logoDark: string;
    favicon: string;
    appleTouchIcon: string;
    ogImage: string;
    copyrightText: string;
    socialFacebook: string;
    socialYoutube: string;
    socialTiktok: string;
    socialDiscord: string;
    socialTwitter: string;
    socialInstagram: string;
    socialTelegram: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    maintenanceMode: boolean;
}

const defaults: ClientSiteSettings = {
    siteName: "EFV CUP Vietnam",
    siteTagline: "Nền tảng giải đấu eFootball hàng đầu Việt Nam",
    siteDescription: "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam.",
    siteUrl: "",
    logo: "",
    logoDark: "",
    favicon: "",
    appleTouchIcon: "",
    ogImage: "",
    copyrightText: "© 2026 eFootball Cup VN. Mọi quyền được bảo lưu.",
    socialFacebook: "",
    socialYoutube: "",
    socialTiktok: "",
    socialDiscord: "",
    socialTwitter: "",
    socialInstagram: "",
    socialTelegram: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    maintenanceMode: false,
};

// Simple in-memory cache to avoid redundant fetches across components
let cachedSettings: ClientSiteSettings | null = null;
let fetchPromise: Promise<ClientSiteSettings> | null = null;

function fetchSettings(): Promise<ClientSiteSettings> {
    if (cachedSettings) return Promise.resolve(cachedSettings);
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch("/api/site-settings")
        .then((r) => r.json())
        .then((data) => {
            if (data.success && data.data) {
                cachedSettings = { ...defaults, ...data.data };
            } else {
                cachedSettings = defaults;
            }
            fetchPromise = null;
            return cachedSettings!;
        })
        .catch(() => {
            fetchPromise = null;
            return defaults;
        });

    return fetchPromise;
}

/**
 * Client-side hook to access site settings (logo, siteName, etc.)
 * Uses a shared cache so multiple components don't re-fetch.
 */
export function useSiteSettings() {
    const [settings, setSettings] = useState<ClientSiteSettings>(cachedSettings || defaults);
    const [isLoaded, setIsLoaded] = useState(!!cachedSettings);

    useEffect(() => {
        fetchSettings().then((s) => {
            setSettings(s);
            setIsLoaded(true);
        });
    }, []);

    return { settings, isLoaded };
}
