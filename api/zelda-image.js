const ZELDA_IMAGES = Object.freeze({
  "subdued-ceremony": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-1.jpg",
    "https://images.nintendolife.com/6ab1a7069b9cf/2017032012061100-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "resolve-and-grief": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-3.jpg",
    "https://images.nintendolife.com/e7ac5ae31f79c/2017032012061400-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "zeldas-resentment": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-5.jpg",
    "https://images.nintendolife.com/a1832a2a17367/2017032012061600-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "blades-of-the-yiga": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-7.jpg",
    "https://images.nintendolife.com/019b65df93816/2017032012061900-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "a-premonition": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-8.jpg",
    "https://images.nintendolife.com/0802b6803f51d/2017032012062100-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "silent-princess": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-9.jpg",
    "https://images.nintendolife.com/3cfe5dff30b59/2017032012062400-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "shelter-from-the-storm": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-11.jpg",
    "https://images.nintendolife.com/e27338713842b/2017032012062600-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "father-and-daughter": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-12.jpg",
    "https://images.nintendolife.com/ddb5b64be8b4e/2017032012062900-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "slumbering-power": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-13.jpg",
    "https://images.nintendolife.com/162c0e3669ce3/2017032012063100-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "to-mount-lanayru": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-14.jpg",
    "https://images.nintendolife.com/385c9f3e5a956/2017032012063400-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "return-of-calamity-ganon": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-15.jpg",
    "https://images.nintendolife.com/93e7be8681662/2017032012063600-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "despair": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-16.jpg",
    "https://images.nintendolife.com/9bd7196d2a703/2017032012063900-f1c11a22faee3b82f21b330e1b786a39.large.jpg"
  ],
  "zeldas-awakening": [
    "https://www.zeldadungeon.net/wiki/Special:Redirect/file/Memory-17.jpg",
    "https://images.nintendolife.com/4b99d97f77c19/final.large.jpg"
  ]
});

async function fetchImage(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const upstream = await fetch(source, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; fejelude.xyz gallery image proxy)"
      }
    });

    if (!upstream.ok) return null;

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) return null;

    return {
      contentType,
      body: Buffer.from(await upstream.arrayBuffer())
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method Not Allowed");
  }

  const id = typeof request.query?.id === "string" ? request.query.id : "";
  const sources = ZELDA_IMAGES[id];

  if (!sources) {
    return response.status(404).send("Unknown Zelda gallery image");
  }

  for (const source of sources) {
    const image = await fetchImage(source);
    if (!image) continue;

    response.setHeader("Content-Type", image.contentType);
    response.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return response.status(200).send(image.body);
  }

  return response.status(502).send("Gallery image sources unavailable");
};
