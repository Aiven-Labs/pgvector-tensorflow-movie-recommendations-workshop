// Step 2. Access Postgres database
const fs = require('fs');
require('dotenv').config();
const pg = require('pg');

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

module.exports.getNumberOfMoviePlots = async () => {
    const client = new pg.Client(config);
    await client.connect();
    try {
        const pgResponse = await client.query(`SELECT count(*) FROM movie_plots`);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

module.exports.enablePGVector = async () => {
    const client = new pg.Client(config);
    await client.connect();
    try {
        const pgResponse = await client.query(`CREATE EXTENSION vector;`);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

module.exports.createTable = async () => {
    const client = new pg.Client(config);
    await client.connect();
    try {
        const pgResponse = await client.query(`CREATE TABLE movie_plots (
            title VARCHAR,
            director VARCHAR,
            "cast" VARCHAR,
            genre VARCHAR,
            plot TEXT,
            "year" SMALLINT,
            wiki VARCHAR,
            embedding vector(512)
        );
    `);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

module.exports.dropTable = async () => {
    const client = new pg.Client(config);
    await client.connect();
    try {
        const pgResponse = await client.query(`DROP TABLE movie_plots`);
        console.log(pgResponse.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

require('make-runnable/custom')({
    printOutput: false
})
