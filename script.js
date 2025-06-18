// Replace with your YouTube Data API v3 key!
const API_KEY = "AIzaSyBmWRgB4-2HXKkbSko1U5im_Ggzwn_fsFY";

// Utility function to detect Shorts by video title or description (case-insensitive, matches '#shorts', ' #shorts', or 'shorts' as a hashtag)
function isShort(video) {
  if (!video.snippet) return false;
  const t = video.snippet.title.toLowerCase();
  const d = video.snippet.description ? video.snippet.description.toLowerCase() : "";
  // Remove all whitespace, check for '#shorts' or ' #shorts' or ' shorts' (as hashtag, word, or at the end)
  return (
    /#shorts\b/.test(t) ||
    /#shorts\b/.test(d) ||
    /\bshorts\b/.test(t) ||
    /\bshorts\b/.test(d)
  );
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

let nextPageToken = null;
let currentQuery = "";
let isLoading = false;

// Fetches and displays videos based on a search query or "load more" for infinite scroll
async function fetchAndDisplayVideos(query, append = false) {
  const videosSection = document.getElementById('videos');
  if (!append) {
    videosSection.innerHTML = "";
    nextPageToken = null;
  }
  if (!query) return;
  isLoading = true;

  let endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  if (nextPageToken) endpoint += `&pageToken=${nextPageToken}`;

  try {
    const resp = await fetch(endpoint);
    const data = await resp.json();

    if (data.error) {
      if (!append) {
        videosSection.innerHTML = `<div class="error-message">API Error: ${data.error.message}</div>`;
      }
      isLoading = false;
      return;
    }

    if (data.items && data.items.length > 0) {
      // Filter out Shorts
      const filteredItems = data.items.filter(video => !isShort(video));
      if (filteredItems.length > 0) {
        const cards = filteredItems.map(createVideoCard).join("");
        videosSection.insertAdjacentHTML("beforeend", cards);
      }
      if (!append && filteredItems.length === 0) {
        videosSection.innerHTML = `<div class="error-message">No non-Shorts videos found for "<b>${query}</b>".</div>`;
      }
    } else if (!append) {
      videosSection.innerHTML = `<div class="error-message">No videos found for "<b>${query}</b>".</div>`;
    }

    nextPageToken = data.nextPageToken || null;
    isLoading = false;
  } catch (e) {
    if (!append) {
      videosSection.innerHTML = `<div class="error-message">Network or API error. Please check your API key and connection.</div>`;
    }
    isLoading = false;
  }
}

// Infinite scroll handler
function handleScroll() {
  const videosSection = document.getElementById('videos');
  if (
    !isLoading &&
    nextPageToken &&
    (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
    )
  ) {
    fetchAndDisplayVideos(currentQuery, true);
  }
}

// Search button and Enter key
document.getElementById('searchBtn').addEventListener('click', () => {
  currentQuery = document.getElementById('searchInput').value.trim();
  fetchAndDisplayVideos(currentQuery, false);
});

document.getElementById('searchInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});

// Infinite scroll event
window.addEventListener('scroll', handleScroll);

// Optionally, search for a default query at start
// currentQuery = "Rick Astley";
// fetchAndDisplayVideos(currentQuery, false);