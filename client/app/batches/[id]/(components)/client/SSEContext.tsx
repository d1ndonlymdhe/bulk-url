"use client";
import type { Url } from "@/app/batches/api/batchesApi";
import { useCallback, useEffect, useRef } from "react";

export default function SSEContext({
    batchId,
    updateUrlState,
}: {
    batchId: string
    updateUrlState: (url: Url) => void,
}) {
    const eventSourceRef = useRef<EventSource | null>(null);

    const registerSSE = () => {
        if (eventSourceRef.current) return;
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE}register-batch-sse/${batchId}`);
        eventSourceRef.current = eventSource;
        eventSource.onopen = () => {
            console.log("SSE connection established.");
        }

        eventSource.addEventListener('url-complete', (event: MessageEvent) => {
            const data = JSON.parse(event.data) as {
                result: Url
            };
            console.log("Received url-complete event:", data);
            updateUrlState(data.result);
        });
    }

    const disconnectSSE = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            console.log("SSE connection closed.");
        }
    }, []);


    useEffect(() => {
        registerSSE();
        return () => {
            disconnectSSE();
        }
    }, [batchId])
    return <div></div>;
}