require('dotenv').config();
const fs = require('fs');
require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const pgp = require('pg-promise')({
    capSQL: true // capitalize all generated SQL
});
const moviePlots = require("./movie-plots.json");//.slice(0, 500);

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

const db = pgp(config);

const storeInPG = (moviePlots) => {
    // set of columns
    const columns = new pgp.helpers.ColumnSet(['title', 'director', 'plot', 'year', 'wiki', 'cast', 'genre', 'embedding'], {table: 'movie_plots'});

    const values = [];
    for (let i = 0; i < moviePlots.length; i++) {
        values.push({
            title: moviePlots[i]['Title'],
            director: moviePlots[i]['Director'],
            plot: moviePlots[i]['Plot'],
            year: moviePlots[i]['Release Year'],
            cast: moviePlots[i]['Cast'],
            genre: moviePlots[i]['Genre'],
            wiki: moviePlots[i]['Wiki Page'],
            embedding: `[${moviePlots[i]['embedding']}]`
        })
    }

    // generating a multi-row insert query:
    const query = pgp.helpers.insert(values, columns);

    // executing the query:
    db.none(query).then();
}

use.load().then(async model => {
    // Select batchSize depending on your machine's available resources.
    // When running on GitPod 150-200 is upper limit before TF starts bringing memory warnings
    const batchSize = 150;
    for (let start = 0; start < moviePlots.length; start += batchSize) {
        const end = Math.min(start + batchSize, moviePlots.length);
        console.log(`Processing starting from ${start} with the step ${batchSize} of total amount ${moviePlots.length}.`);
        const plotDescriptions = moviePlots.slice(start, end).map(moviePlot => moviePlot.Plot);
        const embeddings = await model.embed(plotDescriptions);
        const vectors = [...embeddings.arraySync()];
        for (let i = start; i < end; i++) {
            moviePlots[i]['embedding'] = vectors[i - start];
        }
        storeInPG(moviePlots.slice(start, end));
    }
});