"use client";
import type { Url } from "@/app/batches/api/batchesApi";
import { useEffect, useRef } from "react";

export default function SSEContext({
    batchId,
    updateUrlState
}: {
    batchId: string
    updateUrlState: (url: Url) => void
}) {
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (eventSourceRef.current) return;
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE}register-batch-sse/${batchId}`);
        eventSource.onerror = (error) => {
            console.error("SSE error:", error);
            eventSource.close();
        }
        eventSource.onopen = () => {
            console.log("SSE connection established.");
        }

        eventSource.addEventListener('url-complete', (event: MessageEvent) => {
            const data = JSON.parse(event.data) as {
                urlId: string;
                result: Url
            };
            updateUrlState(data.result);
        });

        return () => {
            eventSource.close();
            eventSourceRef.current = null;
            console.log("SSE connection closed.");
        }
    }, [])
    return <div></div>;
}