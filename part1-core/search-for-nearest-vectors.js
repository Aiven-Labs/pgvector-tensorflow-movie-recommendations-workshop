require('dotenv').config();
const fs = require('fs');
const pg = require('pg');
require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

const config = {
    user: process.env.PG_NAME,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('./ca.pem').toString(),
    },
};

use.load().then(async model => {
    const embeddings = await model.embed("a lot of cute puppies");
    const embeddingArray = embeddings.arraySync()[0];

    const client = new pg.Client(config);
    await client.connect();
    try {
        const pgResponse = await client.query(
            `SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(embeddingArray)}' LIMIT 5;`);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end()
    }
});