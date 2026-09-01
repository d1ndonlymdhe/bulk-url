"use client";

import { BatchesApi } from "@/app/batches/api/batchesApi";
import { Badge, Button, Card, Container, Grid, Group, List, ScrollArea, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function CreateBatchPage() {
    const [batchName, setBatchName] = useState("");
    const [urlsText, setUrlsText] = useState("");
    const router = useRouter();
    const queryClient = useQueryClient();

    const urls = useMemo(
        () => urlsText.split("\n").map(u => u.trim()).filter(Boolean),
        [urlsText],
    );

    const createBatch = useMutation({
        mutationFn: (payload: { batchName: string; urls: string[] }) =>
            BatchesApi.createBatch(payload.batchName, payload.urls),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["batches"] });
            // TODO: redirect to /batches/${result.batch.id} once the single-batch view exists
            router.push("/batches");
        },
    });

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        createBatch.mutate({ batchName, urls });
    }

    return (
        <Container size="lg" py="xl">
            <Title order={1} mb="lg">Create Batch</Title>
            <form onSubmit={handleSubmit}>
                <Grid gap="xl">
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Stack gap="md">
                            <TextInput
                                label="Batch name"
                                value={batchName}
                                onChange={e => setBatchName(e.target.value)}
                            />
                            <Textarea
                                label="URLs (one per line)"
                                value={urlsText}
                                onChange={e => setUrlsText(e.target.value)}
                                minRows={14}
                                autosize
                                styles={{ input: { fontFamily: "var(--font-geist-mono)" } }}
                            />
                            {createBatch.isError && (
                                <Text size="sm" c="red">
                                    {createBatch.error instanceof Error ? createBatch.error.message : "Failed to create batch"}
                                </Text>
                            )}
                            <Button type="submit" loading={createBatch.isPending} disabled={urls.length === 0} style={{ alignSelf: "flex-start" }}>
                                Create
                            </Button>
                        </Stack>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Card withBorder radius="md" padding="lg" h="100%">
                            <Group justify="space-between" mb="sm">
                                <Text fw={600}>Preview</Text>
                                <Badge variant="light">{urls.length} URL{urls.length === 1 ? "" : "s"}</Badge>
                            </Group>
                            {urls.length === 0 ? (
                                <Text size="sm" c="dimmed">Paste URLs on the left, one per line, to see them here.</Text>
                            ) : (
                                <ScrollArea.Autosize mah={420}>
                                    <List size="sm" spacing={4}>
                                        {urls.map((url, i) => (
                                            <List.Item key={`${url}-${i}`}>
                                                <Text size="sm" ff="monospace" style={{ wordBreak: "break-all" }}>{url}</Text>
                                            </List.Item>
                                        ))}
                                    </List>
                                </ScrollArea.Autosize>
                            )}
                        </Card>
                    </Grid.Col>
                </Grid>
            </form>
        </Container>
    );
}
