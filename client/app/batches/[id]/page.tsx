import { BatchInfo } from "@/app/batches/[id]/(components)/server/BatchInfo";
import { BatchesApi } from "@/app/batches/api/batchesApi";
import { Container, Text } from "@mantine/core";
import { Suspense } from "react";

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function BatchPage({ params }: PageProps) {
    const batchId = (await params).id;
    const batch = await BatchesApi.getBatch(batchId);
    return (
        <Container size="lg" py="xl">
            <Suspense fallback={<Text size="sm" c="dimmed">Loading batch info...</Text>}>
                <BatchInfo batch={batch} />
            </Suspense>
        </Container>
    )

}
