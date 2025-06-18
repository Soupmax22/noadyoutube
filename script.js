// Replace with your YouTube Data API v3 key!
const API_KEY = "YOUR_API_KEY_HERE";

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

// Fetches and displays videos based on a search query
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
      videosSection.innerHTML = data.items.map(createVideoCard).join("");
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