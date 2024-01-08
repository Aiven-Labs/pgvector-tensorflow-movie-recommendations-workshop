// Step 1. Use TensorFlow to create a single vector

require('@tensorflow/tfjs-node');
const encoder = require('@tensorflow-models/universal-sentence-encoder');
const moviePlots = require("./movie-plots.json");
encoder.load().then(async model => {
    // Select a movie plot that you want to encode
    const sampleMoviePlot = moviePlots[0];

    // Request embedding
    const embeddings = await model.embed(sampleMoviePlot['Plot']);

    // Print out the vector. arraySync() returns the tensor data as a nested array.
    console.log(embeddings.arraySync());
});
