import { BatchesApi, type Batch, type Url, type UrlJobStatus } from "@/app/batches/api/batchesApi";
import { Badge, Card, Group, ScrollArea, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { Suspense } from "react";

const jobStatusColor: Record<UrlJobStatus, string> = {
    queued: "gray",
    processing: "blue",
    complete: "green",
    failed: "red",
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

export async function BatchInfo({ batch }: { batch: Batch }) {
    return (
        <Stack gap="xl">
            <Group justify="space-between" align="flex-start">
                <div>
                    <Title order={1} mb="xs">{batch.name}</Title>
                    <Text size="sm" c="dimmed">ID: {batch.id}</Text>
                </div>
                <Card withBorder radius="md" padding="md">
                    <Group gap="xl">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase">Created</Text>
                            <Text size="sm">{new Date(batch.createdAt).toLocaleString()}</Text>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase">Updated</Text>
                            <Text size="sm">{new Date(batch.updatedAt).toLocaleString()}</Text>
                        </div>
                    </Group>
                </Card>
            </Group>
            <Suspense fallback={<Text size="sm" c="dimmed">Loading URLs...</Text>}>
                <BatchUrls batchId={batch.id} />
            </Suspense>
        </Stack>
    );
}

async function BatchUrls({ batchId }: { batchId: string }) {
    const urls = await BatchesApi.getBatchUrls(batchId);
    return (
        <div>
            <Group justify="space-between" mb="sm">
                <Title order={2} size="h4">URLs</Title>
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
                                <TableTh>Created at</TableTh>
                                <TableTh>Updated at</TableTh>
                            </TableTr>
                        </TableThead>
                        <TableTbody>
                            {urls.map(url => (
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
                                        <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{new Date(url.createdAt).toLocaleString()}</Text>
                                    </TableTd>
                                    <TableTd>
                                        <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{new Date(url.updatedAt).toLocaleString()}</Text>
                                    </TableTd>
                                </TableTr>
                            ))}
                        </TableTbody>
                    </Table>
                </ScrollArea>
            </Card>
        </div>
    );
}
