require('dotenv').config();
const fs = require('fs');
const pg = require('pg');
require('@tensorflow/tfjs-node');
const encoder = require('@tensorflow-models/universal-sentence-encoder');

// Connecting to cloud-based PostgreSQL using credentials and ca.pem
// Configuration settings are taken from .env
const config = {
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca.pem').toString(),
    },
};

encoder.load().then(async model => {
    const testPhrase = "a lot of cute puppies";
    const embeddingRequest = await model.embed(testPhrase);
    const testPhraseVector = embeddingRequest.arraySync()[0];

    // connecting to Postgres
    const client = new pg.Client(config);
    await client.connect();
    try {
        // using PGVector extension to find 5 closest vectors from movie_plots in comparison to testPhraseVector
        const pgResponse = await client.query(
            `SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(testPhraseVector)}' LIMIT 5;`);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end()
    }
});
