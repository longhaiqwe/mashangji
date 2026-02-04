import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native'; // Note: React Native types might not be available in strict Vite app, but Capacitor usually mimics web behavior. 
// Actually we are in a web/capacitor app, so we use capacitor plugins directly.
import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface SubscriptionContextType {
    isPro: boolean;
    currentOffering: PurchasesPackage | null; // The annual package we want to display
    customerInfo: CustomerInfo | null;
    loading: boolean;
    purchase: () => Promise<void>;
    restore: () => Promise<void>;
    priceString: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
    const [isPro, setIsPro] = useState(false);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
    const [loading, setLoading] = useState(true);

    const API_KEY = import.meta.env.VITE_REVENUECAT_APPLE_KEY;

    useEffect(() => {
        const init = async () => {
            if (!Capacitor.isNativePlatform()) {
                console.log('Not running on native platform, skipping RevenueCat init');
                setLoading(false);
                return;
            }

            if (!API_KEY) {
                console.error('RevenueCat API Key not found!');
                setLoading(false);
                return;
            }

            try {
                if (Capacitor.getPlatform() === 'ios') {
                    await Purchases.configure({ apiKey: API_KEY });
                } else if (Capacitor.getPlatform() === 'android') {
                    // TODO: Add Android key if needed
                }

                await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

                const { customerInfo: info } = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                checkProStatus(info);

                await loadOfferings();
            } catch (e) {
                console.error('Failed to init RevenueCat:', e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const checkProStatus = (info: CustomerInfo) => {
        // Check if the user has the "mashangji Pro" entitlement (must match RevenueCat Dashboard)
        // 调试日志：打印所有 entitlements 信息
        console.log('=== RevenueCat Debug ===');
        console.log('All entitlements:', JSON.stringify(info.entitlements, null, 2));
        console.log('Active entitlements:', Object.keys(info.entitlements.active));
        console.log('Looking for entitlement: mashangji Pro');

        const isProMember = typeof info.entitlements.active['mashangji Pro'] !== "undefined";
        console.log('isPro result:', isProMember);
        console.log('========================');

        setIsPro(isProMember);
    };

    const loadOfferings = async () => {
        try {
            const offerings = await Purchases.getOfferings();
            console.log('RevenueCat Offerings:', JSON.stringify(offerings, null, 2));

            if (offerings.current && offerings.current.availablePackages.length > 0) {
                // Find the package we want to sell (Annual)
                const annualPackage = offerings.current.availablePackages.find(
                    (pkg) => pkg.identifier === 'Annual'
                ) || offerings.current.availablePackages[0]; // Fallback to first available

                console.log('Selected Annual Package:', annualPackage);
                setCurrentOffering(annualPackage);
            } else {
                console.warn('No current offering found in RevenueCat. Available offerings:', Object.keys(offerings.all));
            }
        } catch (e) {
            console.error('Error loading offerings:', e);
        }
    };

    const purchase = async () => {
        if (!currentOffering) {
            alert('暂时无法获取商品信息，请稍后再试');
            return;
        }

        try {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: currentOffering });
            setCustomerInfo(customerInfo);
            checkProStatus(customerInfo);
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Purchase error:', e);
                alert(`购买失败: ${e.message}`);
            }
        }
    };

    const restore = async () => {
        try {
            const { customerInfo } = await Purchases.restorePurchases();
            setCustomerInfo(customerInfo);
            checkProStatus(customerInfo);
            if (typeof customerInfo.entitlements.active['mashangji Pro'] !== "undefined") {
                alert("恢复购买成功！");
            } else {
                alert("未找到可恢复的购买记录。");
            }
        } catch (e: any) {
            console.error('Restore error:', e);
            alert(`恢复失败: ${e.message}`);
        }
    };

    const priceString = currentOffering?.product.priceString || '¥98.00';

    return (
        <SubscriptionContext.Provider value={{ isPro, currentOffering, customerInfo, loading, purchase, restore, priceString }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
