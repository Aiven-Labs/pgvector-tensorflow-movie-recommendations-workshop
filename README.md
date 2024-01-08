# Building a movie recommendation system with Tensorflow and PGVector

## Part 0. Prepare working environment

### Step 1. Set up PG service with Aiven

Register at [https://go.aiven.io/get-pgvector](https://go.aiven.io/get-pgvector) to host your PostgreSQL service for free in the cloud and get additional 400$ credits for other services.

Follow the registration steps:

https://github.com/Aiven-Labs/pgvector-tensorflow-movie-recommendations-workshop/assets/4600541/7aba8284-b1c3-45d6-a792-dd8abda2378a


### Step 2. Set up GitPod

Open [https://gitpod.io/#https://github.com/Aiven-Labs/pgvector-tensorflow-movie-recommendations-workshop/](https://gitpod.io/#https://github.com/Aiven-Labs/pgvector-tensorflow-movie-recommendations-workshop/) to create a workspace with the lab.

## Part 1. Core Functionality: Generating embeddings and finding the closest vectors

### Step 1. Setup TensorFlow to create a single vector
In this part we'll be working in folder **part1-core**. Navigate there:
```
cd part1-core
```
The movie plot dataset is already included. To get more information check [https://www.kaggle.com/datasets/jrobischon/wikipedia-movie-plots](https://www.kaggle.com/datasets/jrobischon/wikipedia-movie-plots)

Install the dependencies:
```npm install```

Open **encode-single-movie-plot.js** to see how to encode a sungle movie plot using TensorFlow library and its sentence encoder model.

Run to see the result:

```
    node encode-single-movie-plot.js
```

Documentation notes:
- [arraySync](https://js.tensorflow.org/api/latest/#tf.Tensor.arraySync) 

### Step 2. Create Postgres  database, table and enable PGVector

To access PostgreSQL database from JavaScript code you need to do two things:
1. Copy **.env-example** and rename to **.env**. Populate it with information from your service:
<img width="1509" alt="Dotenv and pg connection" src="https://github.com/Aiven-Labs/pgvector-tensorflow-movie-recommendations-workshop/assets/4600541/640e20ef-79fc-49f0-a228-477e5fa453b0">

2. Download **ca.pem** and add it next to **.env**.
<img width="1466" alt="Screenshot 2024-01-08 at 15 33 54" src="https://github.com/Aiven-Labs/pgvector-tensorflow-movie-recommendations-workshop/assets/4600541/48fdb641-a354-4aea-a17d-2d60e66362f2">


To enable vector in PostgreSQL we need to execute ``CREATE EXTENSION vector;``. To do so from this JavaScript project run

```
node pg-commands.js enablePGVector
```

To create a table where we'll store movie plots and embeddings run

```
node pg-commands.js createTable
```

Check other commands as well as connection configuration in **pg-commands.js**

### Step 6. Process all movies, generate vector embeddings and store in PG

Open **process-all-movies.js**. It contains logic to iterate through movie plots, generate embeddings and store data in PostgreSQL.

To execute, run:

```
node process-all-movies.js
```

It will take 5-10 minutes to process all records.

### Step 7. Search for nearest vectors

Open **search-for-nearest-vectors.js** to see an example of vector search using PGVector and generated embeddings.

Run with
```
node search-for-nearest-vectors.js
```

## Part 2. Visual Interface: Integrating into a full-stack web application

### Step 1. Next.js project setup

Create a separate folder **part2-fullstack** next to **part1-core**:
```
cd .. && mkdir part2-fullstack && cd part2-fullstack
```

Install Next.js app:
```
npx create-next-app@latest
```

Select following parameters:
```
✔ What is your project named? … movie-recommender
✔ Would you like to use TypeScript? … Yes
✔ Would you like to use ESLint? … No 
✔ Would you like to use Tailwind CSS? … Yes
✔ Would you like to use `src/` directory? … No
✔ Would you like to use App Router? (recommended) … No 
✔ Would you like to customize the default import alias (@/*)? … No
```

You can find more in [https://nextjs.org/](https://nextjs.org/)

To start the Next.js project first navigate to the folder where it was installed (**movie-recommender** if you followed parameters from above) 
```cd movie-recommender```

To start the development server run:
```
npm run dev
```

In GitPod you'll see a pop-up offering to open [todod]

[todo add video]

### Step 2. Do nearest vectors retrieval through API route

Default Next.js project setup includes an example of API route that you can check by going to **pages/api/hello.js**.

In browser open **[your-domain]/api/hello**.

We will create a similar API route. As with the terminal-based project we'll be using dependencies for TensorFlow and for PostgreSQL. Install them by running

```
npm install @tensorflow-models/universal-sentence-encoder && npm install @tensorflow/tfjs-node && npm install pg && npm install dotenv
```

We also need PostgreSQL credentials to access the database. Similar to how we did before:

1. In the folder **movie-recommender** (your Nex.js project) create **.env**. Populate it with information from your service:
   [Todod add picture]
2. Download **ca.pem** and add it next to **.env**.
   [Todod add picture]

To create a new API route, create a new file **pages/api/recommendations.ts**.

Include the dependencies:

```ts
import type { NextApiRequest, NextApiResponse } from 'next'
const fs = require('fs');
const pg = require('pg');
require('@tensorflow/tfjs-node');
const encoder = require('@tensorflow-models/universal-sentence-encoder');
import {UniversalSentenceEncoder} from "@tensorflow-models/universal-sentence-encoder";
```

Connect to PostgreSQL:

```ts
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
```

Add handler with test values for the search string (we'll connect it to user interface in a bit). Note how we reuse PostgreSQL client and TensorFlow model in subsequent calls to improve performance:

```ts
// Initialize the global database client variable
let globalPGClient: pg.Client | null = null;

let globalTFModel: UniversalSentenceEncoder | null  = null;
async function getTFModel() {
   // If the model already exists, return it
   if (globalTFModel) {
      return globalTFModel;
   }

   // Otherwise, load and set the global variable to the new model
   globalTFModel = await encoder.load();
   return globalTFModel;
}
async function getPGClient() {
   // If the client already exists, return it
   if (globalPGClient) {
      return globalPGClient;
   }

   // Otherwise, create a new client and connect
   const client = new pg.Client(config);
   await client.connect();

   // Set the global variable to the new client
   globalPGClient = client;

   return client;
}


export default async function handler(
        req: NextApiRequest,
        res: NextApiResponse<Movie[]>
) {
   const model = await getTFModel();
   const embeddings = await model?.embed(req.body.search);
   const embeddingArray = embeddings?.arraySync()[0];
   const client = await getPGClient();

   try {
      const pgResponse = await client.query(`SELECT * FROM movie_plots ORDER BY embedding <-> '${JSON.stringify(embeddingArray)}' LIMIT 5;`);
      res.status(200).json(pgResponse.rows)
   } catch (err) {
      console.error(err);
   }
}
```

Let's add a **Movie** type. At the top level of the Next.js project create **movie.d.ts** and populate with:

```ts
declare type Movie = {
    title: string,
    director: string,
    cast: string,
    genre: string,
    plot: string,
    year: string,
    wiki: string,
    embedding: number[]
}

export default Movie;
```

Add the dependency into **pages/api/recommendations.ts**:
```
    import type Movie from 'movie.d.ts'
```

Test new Route by opening **[your domain]/api/recommendations**

### Step 3. Frontend integration

Navigate to **pages/index.tsx**

Replace the existing content with 

```tsx
import {useRef, useState} from 'react';
import type Movie from 'movie.d.ts'

export default function Home() {
  const [moviePlots, setMoviePlots] = useState<Movie[]>([])
  const searchInput = useRef<HTMLInputElement>(null);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredSearch = searchInput.current?.value || "";
    fetch('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        search: enteredSearch
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => response.json()).then(data => {
      setMoviePlots(data);
    });
  }

  return (
      <>
        <section id="shorten">
          <div>
            <form onSubmit={search}>
              <label htmlFor="default-search">Search</label>
              <div className="relative">
                <input type="search" id="default-search" ref={searchInput} autoComplete="off"
                       placeholder="Type what do you want to watch about" required/>
                <button type="submit">Search
                </button>
              </div>
            </form>
          </div>
        </section>
        <div className="flex gap-8 flex-wrap flex-col grow shrink items-start mx-24">
          {moviePlots.map(item =>
              <div key={item.title}>
                <div>
                  <h4>From {item.director}</h4>
                  <p>Year {item.year}</p>
                </div>
                <h1>{item.title}</h1>
                <p>
                  {item.plot}
                </p>
                <div>
                  <p><a
                      href={item.wiki}
                  >{item.wiki}</a
                  ></p>
                </div>
              </div>)}
        </div>
      </>
  )
}
```

The the API route **pages/api/recommendations** catch the value **req.body.search** that is sent from **pages/index.tsx**

```ts
const embeddings = await model.embed(req.body.search);
```

### Step 4. Polishing and testing

Let's add the following elements:
1. Indicator for in progress state.
2. Colors and layouts

You can take the inspiration (or simply copy ;) ) the code:

```tsx
import {useRef, useState} from 'react';
import type Movie from 'movie.d.ts'

export default function Home() {
  const [moviePlots, setMoviePlots] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const searchInput = useRef<HTMLInputElement>(null);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const enteredSearch = searchInput.current?.value || "";
    fetch('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        search: enteredSearch
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => response.json()).then(data => {
      setMoviePlots(data);
      setIsLoading(false)
    });
  }

  return (
      <>
        <section id="shorten">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <form onSubmit={search}>
              <label htmlFor="default-search"
                     className="mb-2 text-sm font-medium sr-only text-white">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" aria-hidden="true"
                       xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                  </svg>
                </div>
                <input type="search" id="default-search" ref={searchInput} autoComplete="off"
                       className="block w-full p-4 pl-10 text-sm border rounded-lg  bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
                       placeholder="Type what do you want to watch about" required/>
                <button type="submit"
                        className="text-white absolute right-2.5 bottom-2.5 focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-4 py-2 bg-lightBlue hover:bg-darkBlue focus:ring-blue-800">Search
                </button>
              </div>
            </form>
          </div>
        </section>
        <div className="flex gap-8 flex-wrap flex-col grow shrink items-start mx-24">
          {isLoading ? (<div className="flex justify-center items-center h-32 w-32 mx-auto">
            {/* Embedding the SVG loading indicator */}
            <svg
                className="animate-spin h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
              <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
              ></circle>
              <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>) : moviePlots.map(item =>
              <div key={item.title}
                   className="relative p-10 rounded-xl binline-block justify-start rounded-lg shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] bg-darkBlue items-start">
                <div className="text-6xl absolute top-4 right-4 opacity-80">🍿</div>
                <div>
                  <h4 className="opacity-90 text-xl">From {item.director}</h4>
                  <p className="opacity-50 text-sm">Year {item.year}</p>
                </div>
                <h1 className="text-4xl mt-6">{item.title}</h1>
                <p className="relative mt-6 text opacity-80 italic">
                  {item.plot}
                </p>
                <div>
                  <p className="opacity-50 text-sm mt-6"><a
                      href={item.wiki}
                      className="underline decoration-transparent transition duration-300 ease-in-out hover:decoration-inherit"
                  >{item.wiki}</a
                  ></p>
                </div>
              </div>)}
        </div>
      </>
  )
}
```








