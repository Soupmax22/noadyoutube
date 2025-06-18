// Always use this YouTube Data API v3 key:
const API_KEY = "AIzaSyBmWRgB4-2HXKkbSko1U5im_Ggzwn_fsFY";

// Utility to convert ISO 8601 duration to seconds (e.g., PT1M2S -> 62)
function isoDurationToSeconds(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Renders a video card for each video result
function createVideoCard(video) {
  const title = video.snippet.title.length > 50
    ? video.snippet.title.slice(0, 50) + "..."
    : video.snippet.title;
  const channel = video.snippet.channelTitle;
  const published = new Date(video.snippet.publishedAt).toLocaleString();
  const thumbnail = video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url;

  return `
    <div class="video-card">
      <div class="thumbnail-wrapper">
        <img src="${thumbnail}" alt="Video thumbnail">
      </div>
      <div class="video-info">
        <h3 title="${video.snippet.title}">${title}</h3>
        <div class="channel">${channel}</div>
        <div class="meta">${published}</div>
      </div>
    </div>
  `;
}

// Fetches and displays videos based on a search query, removing all Shorts and duplicates
async function fetchAndDisplayVideos(query) {
  const videosSection = document.getElementById('videos');
  videosSection.innerHTML = "";
  if (!query) return;

  // Use YouTube search API to find videos based on the query
  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  try {
    const resp = await fetch(endpoint);
    const data = await resp.json();

    if (data.error) {
      videosSection.innerHTML = `<div class="error-message">API Error: ${data.error.message}</div>`;
      return;
    }

    if (data.items && data.items.length > 0) {
      // Get all video IDs
      const videoIds = data.items
        .map(video => video.id.videoId || video.id)
        .filter(Boolean);

      // Fetch details (duration) for all videos
      const detailsEndpoint = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`;
      const detailsResp = await fetch(detailsEndpoint);
      const detailsData = await detailsResp.json();

      // Map videoId -> duration in seconds
      const idToDuration = {};
      if (detailsData.items) {
        detailsData.items.forEach(item => {
          idToDuration[item.id] = isoDurationToSeconds(item.contentDetails.duration);
        });
      }

      // Remove Shorts (≤ 60 seconds) and duplicates
      const seen = new Set();
      const filteredItems = data.items.filter(video => {
        const vid = video.id.videoId || video.id;
        if (!vid || seen.has(vid)) return false;
        seen.add(vid);
        return idToDuration[vid] > 60; // Only allow videos longer than 60s
      });

      if (filteredItems.length > 0) {
        videosSection.innerHTML = filteredItems.map(createVideoCard).join("");
      } else {
        videosSection.innerHTML = `<div class="error-message">No non-Shorts videos found for "<b>${query}</b>".</div>`;
      }
    } else {
      videosSection.innerHTML = `<div class="error-message">No videos found for "<b>${query}</b>".</div>`;
    }
  } catch (e) {
    videosSection.innerHTML = `<div class="error-message">Network or API error. Please check your API key and connection.</div>`;
  }
}

// Search button and Enter key
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  fetchAndDisplayVideos(query);
});

document.getElementById('searchInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});

// Optionally, search for a default query at start
// fetchAndDisplayVideos("Rick Astley");