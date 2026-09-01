import { BatchesApi, type Batch } from "@/app/batches/api/batchesApi";
import { Badge, Card, Group, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { Suspense } from "react";

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
                <Table verticalSpacing="sm" horizontalSpacing="lg">
                    <TableThead>
                        <TableTr>
                            <TableTh>URL</TableTh>
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
                                    <Text size="sm" c="dimmed">{new Date(url.createdAt).toLocaleString()}</Text>
                                </TableTd>
                                <TableTd>
                                    <Text size="sm" c="dimmed">{new Date(url.updatedAt).toLocaleString()}</Text>
                                </TableTd>
                            </TableTr>
                        ))}
                    </TableTbody>
                </Table>
            </Card>
        </div>
    );
}
