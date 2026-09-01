import { BatchesApi } from "@/app/batches/api/batchesApi";
import { LinkButton } from "@/app/_components/LinkButton";
import { Card, Container, Group, SimpleGrid, Text, Title } from "@mantine/core";

export default async function BatchesPage() {
    const batches = await BatchesApi.getBatches();
    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" align="flex-end" mb="lg">
                <div>
                    <Title order={1}>Batches</Title>
                    <Text c="dimmed">{batches.length} batch{batches.length === 1 ? "" : "es"}</Text>
                </div>
                <LinkButton href="/batches/create">Create New Batch</LinkButton>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {batches.map(batch => (
                    <Card key={batch.id} withBorder radius="md" padding="lg">
                        <Title order={2} size="h4" mb="xs">{batch.name}</Title>
                        <Text size="sm" c="dimmed">Created at: {new Date(batch.createdAt).toLocaleString()}</Text>
                        <Text size="sm" c="dimmed" mb="md">Updated at: {new Date(batch.updatedAt).toLocaleString()}</Text>
                        <LinkButton href={`/batches/${batch.id}`} size="sm" variant="light" fullWidth>
                            View Batch
                        </LinkButton>
                    </Card>
                ))}
            </SimpleGrid>
        </Container>
    )
}
