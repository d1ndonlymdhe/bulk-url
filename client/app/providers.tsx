"use client";

import { AppShell, Group, MantineProvider, Title } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const navLinkStyle = { textDecoration: "none", color: "inherit" };

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <MantineProvider defaultColorScheme="auto">
            <QueryClientProvider client={queryClient}>
                <AppShell header={{ height: 60 }}>
                    <AppShell.Header>
                        <Group h="100%" px="lg" justify="space-between">
                            <Link href="/" style={navLinkStyle}>
                                <Title order={3}>
                                    Bulk URL Importer
                                </Title>
                            </Link>

                            <Group gap="xl">
                                <Link href="/batches" style={navLinkStyle}>
                                    <Title order={5}>
                                        Batches
                                    </Title>
                                </Link>
                                <Link href="/batches/create" style={navLinkStyle}>
                                    <Title order={5}>
                                        New Batch
                                    </Title>
                                </Link>
                            </Group>
                        </Group>
                    </AppShell.Header>
                    <AppShell.Main>{children}</AppShell.Main>
                </AppShell>
            </QueryClientProvider>
        </MantineProvider>
    );
}
