"use client";
import SSEContext from "@/app/batches/[id]/(components)/client/SSEContext";
import { type UrlJobStatus, type Url, BatchesApi, MAX_URL_RETRIES } from "@/app/batches/api/batchesApi";
import { Group, Title, Badge, Card, ScrollArea, Table, TableThead, TableTr, TableTh, TableTbody, TableTd, Text, Button } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";


const jobStatusColor: Record<UrlJobStatus, string> = {
    queued: "gray",
    processing: "blue",
    complete: "green",
    failed: "red",
    "re-queued": "orange",
    "cancelled": "dimmed"
};

function StatusBadge({ status }: { status: UrlJobStatus }) {
    return (
        <Badge color={jobStatusColor[status]} variant="light" style={{ whiteSpace: "nowrap" }}>
            {status}
        </Badge>
    );
}

function ResponseStatusBadge({ url }: { url: Url }) {
    if (url.responseStatus == null) {
        return <Text size="sm" c="dimmed">—</Text>;
    }
    const color = url.responseStatus < 400 ? "green" : "red";
    return (
        <Badge color={color} variant="outline" style={{ whiteSpace: "nowrap" }}>
            {url.responseStatus}
        </Badge>
    );
}
export default function BatchUrlsClient({ urls, batchId }: { urls: Url[], batchId: string }) {
    const [localUrls, setLocalUrls] = useState<Url[]>(urls);

    const { mutate: retryFailedUrls, isPending, isSuccess, isError } = useMutation({
        mutationFn: async (batchId: string) => {
            return await BatchesApi.retryFailedUrls(batchId);
        },
        onSuccess: () => {
            // Optimistic update
            // setLocalUrls((prevUrls) => {
            //     return prevUrls.map(u => {
            //         return {
            //             ...u,
            //             jobStatus: u.jobStatus == "failed" ? "re-queued" : u.jobStatus,
            //             attempts: u.jobStatus == "failed" ? 0 : u.attempts
            //         }
            //     })
            // })
        }
    })

    const { mutate: cancelBatch, isPending: isCancelPending } = useMutation({
        mutationFn: async (batchId: string) => {
            return await BatchesApi.cancelBatch(batchId);
        },
        onSuccess: () => {
            // Optimistic update
            // setLocalUrls((prevUrls) => {
            //     return prevUrls.map(u => {
            //         return {
            //             ...u,
            //             jobStatus: u.jobStatus !== "complete" && u.jobStatus !== "failed" ? "cancelled" : u.jobStatus
            //         }
            //     })
            // })
        }
    })

    return <div>
        <SSEContext batchId={batchId} updateUrlState={(url) => {
            setLocalUrls(prevUrls => {
                const index = prevUrls.findIndex(u => u.id === url.id);
                if (index !== -1) {
                    const updatedUrls = [...prevUrls];
                    updatedUrls[index] = url;
                    return updatedUrls;
                }
                // No change if the URL is not found in the current state
                return [...prevUrls]
            })
        }} ></SSEContext>
        <Group justify="space-between" mb="sm">
            <Title order={2} size="h4">URLs</Title>
            <Button onClick={() => {
                retryFailedUrls(batchId)
            }} loading={isPending} disabled={localUrls.filter(url => url.jobStatus === "failed").length === 0}>
                Retry Failed
            </Button>
            <Button color="red" onClick={() => {
                cancelBatch(batchId)
            }} loading={isCancelPending} disabled={localUrls.filter(url => url.jobStatus !== "complete" && url.jobStatus !== "cancelled" && url.jobStatus !== "failed").length === 0}>
                Cancel Batch
            </Button>
            <Badge variant="light">{urls.length} total</Badge>
        </Group>
        <Card withBorder radius="md" padding={0}>
            <ScrollArea>
                <Table verticalSpacing="sm" horizontalSpacing="lg" miw={900}>
                    <TableThead>
                        <TableTr>
                            <TableTh>URL</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh>Title</TableTh>
                            <TableTh>Response</TableTh>
                            <TableTh>Time</TableTh>
                            <TableTh>Attempts</TableTh>
                        </TableTr>
                    </TableThead>
                    <TableTbody>
                        {localUrls.map(url => (
                            <TableTr key={url.id}>
                                <TableTd>
                                    <Text size="sm" ff="monospace" style={{ wordBreak: "break-all" }}>{url.url}</Text>
                                </TableTd>
                                <TableTd>
                                    <StatusBadge status={url.jobStatus} />
                                </TableTd>
                                <TableTd>
                                    <Text size="sm" style={{ wordBreak: "break-word" }}>{url.title ?? "—"}</Text>
                                </TableTd>
                                <TableTd>
                                    <ResponseStatusBadge url={url} />
                                </TableTd>
                                <TableTd>
                                    <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{url.responseTime != null ? `${url.responseTime} ms` : "—"}</Text>
                                </TableTd>
                                <TableTd>
                                    <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{url.attempts}/{MAX_URL_RETRIES}</Text>
                                </TableTd>
                            </TableTr>
                        ))}
                    </TableTbody>
                </Table>
            </ScrollArea>
        </Card>
    </div>
}