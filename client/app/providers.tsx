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
                            <Title order={3} component={Link} href="/" style={navLinkStyle}>
                                Bulk URL Importer
                            </Title>
                            <Group gap="xl">
                                <Title order={5} component={Link} href="/batches" style={navLinkStyle}>
                                    Batches
                                </Title>
                                <Title order={5} component={Link} href="/batches/create" style={navLinkStyle}>
                                    New Batch
                                </Title>
                            </Group>
                        </Group>
                    </AppShell.Header>
                    <AppShell.Main>{children}</AppShell.Main>
                </AppShell>
            </QueryClientProvider>
        </MantineProvider>
    );
}
