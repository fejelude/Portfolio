const ZELDA_IMAGES = Object.freeze({
  "subdued-ceremony": "https://images.nintendolife.com/6ab1a7069b9cf/2017032012061100-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "resolve-and-grief": "https://images.nintendolife.com/e7ac5ae31f79c/2017032012061400-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "zeldas-resentment": "https://images.nintendolife.com/a1832a2a17367/2017032012061600-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "blades-of-the-yiga": "https://images.nintendolife.com/019b65df93816/2017032012061900-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "a-premonition": "https://images.nintendolife.com/0802b6803f51d/2017032012062100-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "silent-princess": "https://images.nintendolife.com/3cfe5dff30b59/2017032012062400-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "shelter-from-the-storm": "https://images.nintendolife.com/e27338713842b/2017032012062600-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "father-and-daughter": "https://images.nintendolife.com/ddb5b64be8b4e/2017032012062900-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "slumbering-power": "https://images.nintendolife.com/162c0e3669ce3/2017032012063100-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "to-mount-lanayru": "https://images.nintendolife.com/385c9f3e5a956/2017032012063400-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "return-of-calamity-ganon": "https://images.nintendolife.com/93e7be8681662/2017032012063600-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "despair": "https://images.nintendolife.com/9bd7196d2a703/2017032012063900-f1c11a22faee3b82f21b330e1b786a39.large.jpg",
  "zeldas-awakening": "https://images.nintendolife.com/4b99d97f77c19/final.large.jpg"
});

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method Not Allowed");
  }

  const id = typeof request.query?.id === "string" ? request.query.id : "";
  const source = ZELDA_IMAGES[id];

  if (!source) {
    return response.status(404).send("Unknown Zelda gallery image");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(source, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://www.nintendolife.com/",
        "User-Agent": "Mozilla/5.0 (compatible; fejelude.xyz gallery image proxy)"
      }
    });

    if (!upstream.ok) {
      return response.status(502).send("Gallery image upstream unavailable");
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return response.status(502).send("Gallery image upstream returned invalid content");
    }

    const body = Buffer.from(await upstream.arrayBuffer());

    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return response.status(200).send(body);
  } catch (error) {
    const message = error && error.name === "AbortError"
      ? "Gallery image request timed out"
      : "Gallery image request failed";
    return response.status(502).send(message);
  } finally {
    clearTimeout(timeout);
  }
};
