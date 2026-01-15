import { tavily } from "@tavily/core";

const sanitizeStr = (s) => (typeof s === "string" ? s.replace(/[#*]/g, "") : s);

// Initialize Tavily client
const tvly = new tavily({ apiKey: process.env.TAVILY_API_KEY });

// Convert coordinates to location name using reverse geocoding
const getLocationName = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.county ||
      data.address?.village ||
      `${lat},${lon}`
    );
  } catch (err) {
    console.error("Geocoding error:", err);
    return `${lat},${lon}`;
  }
};

// Check if date is within last N days
const isRecentDate = (dateStr, daysBack = 7) => {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / (1000 * 60 * 60 * 24); // days
    return diff >= 0 && diff <= daysBack;
  } catch {
    return false;
  }
};

// Build comprehensive crisis summary from articles
const buildCrisisSummary = (query, articles, locationName) => {
  if (!articles || articles.length === 0) {
    return `No recent ${query} information available for ${locationName}.`;
  }

  const recentArticles = articles.slice(0, 5);
  const summaryParts = [];

  // Header
  summaryParts.push(
    `Live Crisis Alert: ${query.toUpperCase()} in ${locationName}`
  );
  summaryParts.push(`Total Reports: ${articles.length}`);
  summaryParts.push("---");

  // Article details
  recentArticles.forEach((article, idx) => {
    const date = article.publishedDate
      ? new Date(article.publishedDate).toLocaleDateString()
      : null;
    const title = article.title || "Untitled";
    const content = article.snippet || article.content || "No details available";
    const cleanContent = content
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

    summaryParts.push(
      `\n[${idx + 1}] ${title}`
    );
    if (date) {
      summaryParts.push(`Date: ${date}`);
    }
    summaryParts.push(`Summary: ${cleanContent}...`);
  });

  // Footer
  summaryParts.push("\n---");
  summaryParts.push(
    "⚠️ Note: Verify all information with official sources. Stay alert and follow local emergency guidelines."
  );

  return summaryParts.join("\n");
};

const fetchPastIncidents = async (query, locationName) => {
  try {
    const pastSearchResults = await tvly.search(
      `${query} ${locationName} history past incidents records`,
      {
        searchDepth: "basic",
        maxResults: 8,
        includeImages: false,
      }
    );

    const pastSources = (pastSearchResults.results || [])
      .filter((r) => r && (r.url || r.title || r.snippet))
      .map((r) => ({
        title: r.title || (r.snippet ? r.snippet.slice(0, 120) : "Untitled"),
        url: r.url || null,
        snippet: r.snippet || r.summary || "",
        publishedDate: r.publishedDate || null,
      }));

    return pastSources;
  } catch (err) {
    console.error("Past search error:", err?.message || err);
    return [];
  }
};

const normalizeText = (txt) =>
  (txt || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+\./g, ".")
    .replace(/\n+/g, " ")
    .trim();

const formatHistoricalSummary = ({
  query,
  pastSources,
  locationName,
  radius,
}) => {
  const plural = (n, s) => `${n} ${s}${n === 1 ? "" : "s"}`;

  if (pastSources && pastSources.length) {
    const dateVals = pastSources
      .map((s) => (s.publishedDate ? new Date(s.publishedDate) : null))
      .filter(Boolean);
    const mostRecent =
      dateVals.length > 0
        ? new Date(Math.max(...dateVals.map((d) => d.getTime())))
        : null;
    const mostRecentStr = mostRecent ? mostRecent.toLocaleDateString() : null;

    const summaryParts = [];
    summaryParts.push(
      `\n📊 Historical ${query.toUpperCase()} Records for ${locationName}`
    );
    summaryParts.push("---");
    if (mostRecentStr) {
      summaryParts.push(
        `No live incidents detected at this time. Most recent occurrence: ${mostRecentStr}`
      );
    } else {
      summaryParts.push(`No live incidents detected at this time.`);
    }
    summaryParts.push(`Total historical records found: ${pastSources.length}`);
    summaryParts.push("");

    pastSources.slice(0, 5).forEach((item, idx) => {
      const date = item.publishedDate
        ? new Date(item.publishedDate).toLocaleDateString()
        : null;
      const cleanSnippet = (item.snippet || "").slice(0, 150);
      summaryParts.push(`[${idx + 1}] ${item.title}`);
      if (date) {
        summaryParts.push(`   Date: ${date}`);
      }
      if (cleanSnippet) {
        summaryParts.push(`   Details: ${cleanSnippet}...`);
      }
      summaryParts.push("");
    });

    summaryParts.push("---");
    summaryParts.push(
      "📌 Note: These are historical records. Continue monitoring for any new developments."
    );

    return summaryParts.join("\n");
  }

  return `No ${query} events found within ${radius} km of ${locationName}. The area appears safe.`;
};

export const summarizeCrisisGptOss = async (req, res) => {
  const { lat, lon, radius = 50, query = "crisis" } = req.body;
  if (lat == null || lon == null)
    return res.status(400).json({ error: "lat and lon are required" });

  try {
    const locationName = await getLocationName(lat, lon);
    console.log(`🔍 Searching for "${query}" near ${locationName}`);

    const searchQuery = `${query} ${locationName}`;

    let searchResults = null;
    let isLiveEvent = false;
    let liveSources = [];

    try {
      searchResults = await tvly.search(searchQuery, {
        searchDepth: "basic",
        maxResults: 10,
        includeImages: false,
        includeAnswer: true,
      });

      console.log(
        `✅ Raw results: ${searchResults?.results?.length || 0} items found`
      );

      // Filter for RECENT articles only (last 7 days)
      liveSources = (searchResults.results || [])
        .filter((r) => {
          const isValid = r && (r.title || r.snippet || r.url);
          const isRecent = isRecentDate(r.publishedDate, 7);
          if (isValid && r.publishedDate) {
            console.log(
              `  - "${r.title?.slice(0, 50)}" | Date: ${r.publishedDate} | Recent: ${isRecent}`
            );
          }
          return isValid && isRecent;
        })
        .map((r) => ({
          title: r.title || (r.snippet ? r.snippet.slice(0, 120) : "Untitled"),
          url: r.url || null,
          score: r.score || 0,
          snippet: r.snippet || r.summary || "",
          content: r.content || "",
          publishedDate: r.publishedDate || null,
        }));

      isLiveEvent = liveSources.length > 0;
      console.log(
        `🚨 Live incidents detected: ${isLiveEvent} (${liveSources.length} recent articles)`
      );
    } catch (err) {
      console.error("❌ Tavily search error:", err?.message || err);
    }

    let summary = "";
    let resultData = [];
    let pastSources = [];
    let dataSource = "live";

    if (isLiveEvent && liveSources.length > 0) {
      // Live crisis detected
      console.log("📡 Building live crisis summary...");
      resultData = liveSources;
      dataSource = "live";

      // Build detailed crisis summary from articles
      summary = buildCrisisSummary(query, liveSources, locationName);
    } else {
      // No live events - fetch historical
      console.log("📚 No live events. Fetching historical records...");
      dataSource = "historical";

      pastSources = await fetchPastIncidents(query, locationName);
      resultData = pastSources;

      // Build historical summary
      summary = formatHistoricalSummary({
        query,
        pastSources,
        locationName,
        radius,
      });
    }

    if (typeof summary === "string") {
      summary = sanitizeStr(summary);
    }

    return res.status(200).json({
      summary,
      model: "gpt-oss:120b-cloud",
      locationName,
      location: { lat: Number(lat), lon: Number(lon), radius: Number(radius) },
      sources: resultData,
      pastSources,
      resultCount: resultData.length,
      dataSource,
      isLiveEvent,
    });
  } catch (err) {
    console.error("❌ summarizeCrisisGptOss error:", err?.message || err);
    return res.status(500).json({
      error: "Failed to summarize crises: " + (err?.message || err),
      details: err?.message,
    });
  }
};