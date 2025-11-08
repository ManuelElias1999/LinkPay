"use client";
import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";

const aggregatorV3InterfaceABI = [
    {
        inputs: [],
        name: "latestRoundData",
        outputs: [
            { internalType: "uint80", name: "roundId", type: "uint80" },
            { internalType: "int256", name: "answer", type: "int256" },
            { internalType: "uint256", name: "startedAt", type: "uint256" },
            { internalType: "uint256", name: "updatedAt", type: "uint256" },
            { internalType: "uint80", name: "answeredInRound", type: "uint80" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "description",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
];

// Chainlink Price Feed Addresses (Arbitrum Mainnet)
const CHAINLINK_USDC_USD_PRICE_FEED = "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3";
const CHAINLINK_BRL_USD_PRICE_FEED = "0x04b7384473A2aDF1903E3a98aCAc5D62ba8C2702";


const RPC_ENDPOINT = "https://arb1.arbitrum.io/rpc";

export const PriceFeed = () => {
    const [price, setPrice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const providerRef = useRef<ethers.providers.JsonRpcProvider | null>(null);
    const usdcContractRef = useRef<ethers.Contract | null>(null);
    const brlContractRef = useRef<ethers.Contract | null>(null);


    const initializeProvider = async (): Promise<ethers.providers.JsonRpcProvider> => {
         const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
         await provider.getBlockNumber();
         return provider;

    };

    useEffect(() => {
        let isMounted = true;

        const setupAndFetch = async () => {
            try {
                const provider = await initializeProvider();
                if (!isMounted) return;

                providerRef.current = provider;

                // Initialize USDC/USD price feed contract
                const usdcPriceFeedContract = new ethers.Contract(
                    CHAINLINK_USDC_USD_PRICE_FEED,
                    aggregatorV3InterfaceABI,
                    provider
                );
                usdcContractRef.current = usdcPriceFeedContract;

                // Initialize BRL/USD price feed contract
                const brlPriceFeedContract = new ethers.Contract(
                    CHAINLINK_BRL_USD_PRICE_FEED,
                    aggregatorV3InterfaceABI,
                    provider
                );
                brlContractRef.current = brlPriceFeedContract;

                // Verify both price feed contracts
                try {
                    const usdcDescription = await usdcPriceFeedContract.description();
                    console.log(`USDC/USD Feed verified: ${usdcDescription}`);
                } catch (err: any) {
                    console.error(`USDC/USD Feed address invalid: ${CHAINLINK_USDC_USD_PRICE_FEED}`, err);
                    throw new Error(`Invalid USDC/USD feed address: ${err.message}`);
                }

                try {
                    const brlDescription = await brlPriceFeedContract.description();
                    console.log(`BRL/USD Feed verified: ${brlDescription}`);
                } catch (err: any) {
                    console.error(`BRL/USD Feed address invalid: ${CHAINLINK_BRL_USD_PRICE_FEED}`, err);
                    throw new Error(`Invalid BRL/USD feed address: ${err.message}`);
                }

                const fetchPrice = async () => {
                    if (!isMounted || !usdcContractRef.current || !brlContractRef.current) return;

                    try {
                        setError(null);

                        // Fetch both USDC/USD and BRL/USD prices from Chainlink
                        let usdcRoundData, usdcDecimals, brlRoundData, brlDecimals;
                        
                        try {
                            [usdcRoundData, usdcDecimals] = await Promise.all([
                                usdcContractRef.current.latestRoundData(),
                                usdcContractRef.current.decimals(),
                            ]);
                        } catch (err: any) {
                            throw new Error(`Failed to fetch USDC price: ${err.message}`);
                        }

                        try {
                            [brlRoundData, brlDecimals] = await Promise.all([
                                brlContractRef.current.latestRoundData(),
                                brlContractRef.current.decimals(),
                            ]);
                        } catch (err: any) {
                            throw new Error(`Failed to fetch BRL price: ${err.message}`);
                        }

                        if (!usdcRoundData || usdcRoundData.answer === null || usdcRoundData.answer === undefined) {
                            throw new Error("Invalid USDC price data received");
                        }

                        if (!brlRoundData || brlRoundData.answer === null || brlRoundData.answer === undefined) {
                            throw new Error("Invalid BRL price data received");
                        }

                        const currentTime = Math.floor(Date.now() / 1000);
                        const usdcUpdatedAt = Number(usdcRoundData.updatedAt);
                        const brlUpdatedAt = Number(brlRoundData.updatedAt);
                        const stalenessThreshold = 3600; // 1 hour in seconds

                        if (currentTime - usdcUpdatedAt > stalenessThreshold || currentTime - brlUpdatedAt > stalenessThreshold) {
                            console.warn("Price data is stale");
                        }

                        // Calculate USDC/BRL = (USDC/USD) / (BRL/USD)
                        const usdcPriceValue = ethers.utils.formatUnits(usdcRoundData.answer, usdcDecimals);
                        const brlPriceValue = ethers.utils.formatUnits(brlRoundData.answer, brlDecimals);
                        
                        const usdcPriceNumber = parseFloat(usdcPriceValue);
                        const brlPriceNumber = parseFloat(brlPriceValue);

                        if (isNaN(usdcPriceNumber) || usdcPriceNumber <= 0 || isNaN(brlPriceNumber) || brlPriceNumber <= 0) {
                            throw new Error("Invalid price value");
                        }

                        // Calculate USDC/BRL
                        const usdcBrlPrice = usdcPriceNumber / brlPriceNumber;

                        if (isMounted) {
                            setPrice(usdcBrlPrice.toFixed(2));
                            setLastUpdated(new Date());
                            setLoading(false);
                            console.log(`USDC/BRL Price: R$${usdcBrlPrice.toFixed(2)} (USDC/USD: $${usdcPriceNumber.toFixed(2)}, BRL/USD: $${brlPriceNumber.toFixed(4)})`);
                        }
                    } catch (err: any) {
                        console.error("Error fetching USDC/BRL price:", err);
                        if (isMounted) {
                            const errorMessage = err.message || "Failed to fetch USDC/BRL price";
                            setError(errorMessage);
                            setLoading(false);
                        }
                    }
                };


                await fetchPrice();
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                intervalRef.current = setInterval(fetchPrice, 30000);

            } catch (err: any) {
                console.error("Error initializing price feed:", err);
                if (isMounted) {
                    setError(err.message || "Failed to initialize price feed");
                    setLoading(false);
                }
            }
        };

        setupAndFetch();

        return () => {
            isMounted = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="text-m text-gray-500">USDC/BRL</div>
            {loading && !error && (
                <div className="text-m text-gray-600 animate-pulse">Loading...</div>
            )}
            {error && (
                <div className="text-m text-red-600" title={error}>
                    Error
                </div>
            )}
            {price && !error && (
                <div className="flex flex-col items-end">
                    <div className="text-m font-semibold text-green-600">
                        R${price}
                    </div>
                    {lastUpdated && (
                        <div className="text-m text-gray-400">
                            {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
