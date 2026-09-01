import Fastify from 'fastify'

import * as multipart from "@fastify/multipart";
import * as cors from "@fastify/cors";
import { Type, type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { UrlService } from './apps/urlImport/service/url.service';

const fastify = Fastify({
    logger: true
}).withTypeProvider<TypeBoxTypeProvider>();

fastify.register(multipart.default);
fastify.register(cors.default, {
    origin: "*",
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