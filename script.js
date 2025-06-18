// Always use this YouTube Data API v3 key:
const API_KEY = "AIzaSyBmWRgB4-2HXKkbSko1U5im_Ggzwn_fsFY";

let nextPageToken = null;
let currentQuery = "";
let isLoading = false;
let seenVideoIds = new Set();

// Format date: DD/MM/YYYY, HH:MM:SS
function formatDate(dateString) {
  const d = new Date(dateString);
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Custom video result rendering
function createVideoBlock(video) {
  const title = video.snippet.title;
  const channel = video.snippet.channelTitle;
  const published = formatDate(video.snippet.publishedAt);
  return `
    <div class="video-block">
      <div class="video-title">${title}</div>
      <div class="video-channel">${channel}</div>
      <div class="video-date">${published}</div>
    </div>
  `;
}

// Convert ISO 8601 duration to seconds
function isoDurationToSeconds(iso) {
  // Example: PT1M2S => 62 seconds
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Fetches and displays videos based on a search query or "load more" for infinite scroll
async function fetchAndDisplayVideos(query, append = false) {
  const videosSection = document.getElementById('videos');
  if (!append) {
    videosSection.innerHTML = "";
    nextPageToken = null;
    seenVideoIds = new Set();
  }
  if (!query) return;
  isLoading = true;

  let endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${API_KEY}`;
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
      // Filter duplicates
      const uniqueVideos = data.items.filter(video => {
        const vid = video.id && (video.id.videoId || video.id);
        if (!vid) return false;
        if (seenVideoIds.has(vid)) return false;
        seenVideoIds.add(vid);
        return true;
      });

      // Fetch durations for all videos in one batch
      const idList = uniqueVideos.map(v => v.id.videoId || v.id).join(',');
      const detailsEndpoint = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${idList}&key=${API_KEY}`;
      const detailsResp = await fetch(detailsEndpoint);
      const detailsData = await detailsResp.json();

      // Map videoId -> duration in seconds
      const idToDuration = {};
      if (detailsData.items) {
        detailsData.items.forEach(item => {
          idToDuration[item.id] = isoDurationToSeconds(item.contentDetails.duration);
        });
      }

      // Filter out Shorts (duration <= 60s)
      const nonShorts = uniqueVideos.filter(v => {
        const vid = v.id.videoId || v.id;
        return idToDuration[vid] > 60;
      });

      if (nonShorts.length > 0) {
        const blocks = nonShorts.map(createVideoBlock).join("");
        videosSection.insertAdjacentHTML("beforeend", blocks);
      }
      if (!append && nonShorts.length === 0) {
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

window.addEventListener('scroll', handleScroll);