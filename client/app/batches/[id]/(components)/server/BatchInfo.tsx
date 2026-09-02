import { BatchUrls } from "@/app/batches/[id]/(components)/server/BatchUrls";
import { BatchesApi, type Batch, type Url, type UrlJobStatus } from "@/app/batches/api/batchesApi";
import { Badge, Card, Group, ScrollArea, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
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

