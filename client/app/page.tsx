import { Container, Stack, Text, Title } from "@mantine/core";
import { LinkButton } from "@/app/_components/LinkButton";

export default function Home() {
  return (
    <Container size="lg" py="xl">
      <Stack align="flex-start" gap="lg">
        <div>
          <Title order={1} mb="xs">Bulk URL Importer</Title>
          <Text c="dimmed">Import and manage batches of URLs.</Text>
        </div>
        <LinkButton href="/batches">View Batches</LinkButton>
      </Stack>
    </Container>
  );
}
