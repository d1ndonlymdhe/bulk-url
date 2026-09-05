import Fastify from 'fastify'

import * as multipart from "@fastify/multipart";
import * as cors from "@fastify/cors";
import * as sse from "@fastify/sse";
import { Type, type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { UrlService } from './apps/urlImport/urlService';
import { UserContext } from './apps/context/userContext';
import { ActiveUrlJobsContext } from './apps/context/jobsContext';

const fastify = Fastify({
    logger: false,
}).withTypeProvider<TypeBoxTypeProvider>();

// bun allows top level await
await fastify.register(multipart.default);
await fastify.register(cors.default, {
    origin: "*",
    allowedHeaders: "*",
})
await fastify.register(sse.default);

// On startup add incomplete jobs back to the queue the workers will de-duplicate as needed
fastify.addHook("onReady", async () => {
    await UrlService.reprocessIncompleteBatches();
})

fastify.get("/register-batch-sse/:batchId", {
    sse: true,
    schema: {
        params: Type.Object({
            batchId: Type.String()
        })
    }
}, async (req, res) => {
    res.header("Content-Type", "text/event-stream");
    const { batchId } = req.params;
    const stream = res.sse;
    stream.keepAlive();
    stream.sendHeaders(200);
    const batchWithUrls = await UrlService.getUrlsByBatchId(batchId);
    if (!batchWithUrls) {
        res.status(404).send({ error: `Batch with id ${batchId} not found` });
        return;
    }
    const urls = batchWithUrls;
    const urlIds = urls.map(url => url.id);
    const userContext = new UserContext(urlIds, stream);
    const contextId = userContext.getId();
    ActiveUrlJobsContext.addUserContext(userContext);
    // Cleanup when the stream is closed
    stream.onClose(() => {
        ActiveUrlJobsContext.removeUserContext(contextId);
        console.log(`SSE stream closed for batch ${batchId}, user context ${contextId} removed`);
    })
})

// FOR TESTING
fastify.get("/test-endpoint/:waitTime", {
    schema: {
        params: Type.Object({
            waitTime: Type.Number()
        })
    }
}, async (req, res) => {
    const { waitTime } = req.params;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    res.send({ message: `Waited for ${waitTime} ms` });
})

fastify.get("/test-endpoint/:waitTime/fail", {
    schema: {
        params: Type.Object({
            waitTime: Type.Number()
        })
    }
}, async (req, res) => {
    const { waitTime } = req.params;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    res.raw.socket?.destroy();
    // res.send({ message: `Waited for ${waitTime} ms` });
})


fastify.get("/", async (req, res) => {
    res.send({ message: "HELLO" });
})

fastify.get("/batches", async (req, res) => {
    const batches = await UrlService.getAllBatches();
    res.send(batches);
})

fastify.get("/batches/:batchId", {
    schema: {
        params: Type.Object({
            batchId: Type.String()
        })
    }
}, async (req, res) => {
    const { batchId } = req.params
    const batchWithUrls = await UrlService.getBatch(batchId);
    res.send(batchWithUrls);
})

fastify.get("/batches/:batchId/urls", {
    schema: {
        params: Type.Object({
            batchId: Type.String()
        })
    }
}, async (req, res) => {
    const { batchId } = req.params
    const urls = await UrlService.getUrlsByBatchId(batchId);
    res.send(urls);
})

fastify.post("/batch", {
    schema: {
        body: Type.Object({
            batchName: Type.String(),
            urls: Type.Array(Type.String())
        })
    }
}, async (req, res) => {
    const { batchName, urls } = req.body;
    const result = await UrlService.importUrls(batchName, urls);
    res.send(result);
})

fastify.post("/batch/:batchId/retry", {
    schema: {
        params: Type.Object({
            batchId: Type.String()
        })
    }
}, async (req, res) => {
    const { batchId } = req.params;
    const result = await UrlService.retryFailedUrls(batchId);
    res.send(result);
})

fastify.post("/batch/:batchId/cancel", {
    schema: {
        params: Type.Object({
            batchId: Type.String()
        })
    }
}, async (req, res) => {
    const { batchId } = req.params;
    const result = await UrlService.cancelBatch(batchId);
    res.send(result);
})

fastify.listen({
    host: "0.0.0.0",
    port: 8000
}, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1)
    }
    fastify.log.info(`Server is running on ${address}`);
})