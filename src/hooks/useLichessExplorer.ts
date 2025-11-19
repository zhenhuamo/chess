import { useEffect, useState, useRef } from "react";
import { LichessExplorerResponse } from "@/src/types/lichess";

interface UseLichessExplorerOptions {
    variant?: "standard" | "antichess" | "atomic" | "crazyhouse" | "horde" | "kingofthehill" | "racingkings" | "threecheck";
    speeds?: string[]; // e.g. ["blitz", "rapid", "classical"]
    ratings?: number[]; // e.g. [1600, 1800, 2000, 2200, 2500]
    db?: "lichess" | "masters";
}

const CACHE = new Map<string, LichessExplorerResponse>();

export function useLichessExplorer(fen: string, options: UseLichessExplorerOptions = {}) {
    const [data, setData] = useState<LichessExplorerResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        variant = "standard",
        speeds = ["blitz", "rapid", "classical"],
        ratings = [1600, 1800, 2000, 2200, 2500],
        db = "lichess",
    } = options;

    useEffect(() => {
        if (!fen) return;

        const fetchExplorer = async () => {
            setLoading(true);
            setError(null);

            try {
                // Construct URL
                const baseUrl = db === "masters"
                    ? "https://explorer.lichess.ovh/masters"
                    : "https://explorer.lichess.ovh/lichess";

                const params = new URLSearchParams();
                params.set("fen", fen);

                if (db === "lichess") {
                    params.set("variant", variant);
                    if (speeds.length) params.set("speeds", speeds.join(","));
                    if (ratings.length) params.set("ratings", ratings.join(","));
                }

                const url = `${baseUrl}?${params.toString()}`;

                // Check cache
                if (CACHE.has(url)) {
                    setData(CACHE.get(url)!);
                    setLoading(false);
                    return;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    if (res.status === 429) throw new Error("Rate limit exceeded");
                    throw new Error("Failed to fetch explorer data");
                }

                const json: LichessExplorerResponse = await res.json();
                CACHE.set(url, json);
                setData(json);
            } catch (err: any) {
                setError(err.message || "Unknown error");
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        // Debounce to avoid spamming API while scrolling/playing fast
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(fetchExplorer, 200);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [fen, variant, speeds, ratings, db]);

    return { data, loading, error };
}
