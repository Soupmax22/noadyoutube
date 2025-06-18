// Replace with your YouTube Data API v3 key!
const API_KEY = "YOUR_API_KEY_HERE";

// Renders the main video card
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
        <h3>${title}</h3>
        <div class="channel">${channel}</div>
        <div class="meta">${published}</div>
      </div>
    </div>
  `;
}

// Renders a recommended video card
function createRecommendedCard(video) {
  const videoId = video.id.videoId || video.id;
  const title = video.snippet.title.length > 40
    ? video.snippet.title.slice(0, 40) + "..."
    : video.snippet.title;
  const channel = video.snippet.channelTitle;
  const published = new Date(video.snippet.publishedAt).toLocaleDateString();
  const thumbnail = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url;

  return `
    <div class="recommended-card" data-videoid="${videoId}">
      <div class="recommended-thumb">
        <img src="${thumbnail}" alt="Recommended thumbnail">
      </div>
      <div class="rec-info">
        <h4>${title}</h4>
        <div class="channel">${channel}</div>
        <div class="meta">${published}</div>
      </div>
    </div>
  `;
}

// Fetch and display a single main video by ID
async function fetchAndDisplayVideo(videoId) {
  const videosSection = document.getElementById('videos');
  videosSection.innerHTML = "";
  if (!videoId) return;

  const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
  try {
    const resp = await fetch(endpoint);
    const data = await resp.json();

    if (data.error) {
      videosSection.innerHTML = `<div class="error-message">API Error: ${data.error.message}</div>`;
      document.getElementById("recommended-list").innerHTML = "";
      return;
    }

    if (data.items && data.items.length > 0) {
      const card = createVideoCard(data.items[0]);
      videosSection.innerHTML = card;
      fetchAndDisplayRecommended(videoId);
    } else {
      videosSection.innerHTML = `<div class="error-message">No video found for ID <code>${videoId}</code>.</div>`;
      document.getElementById("recommended-list").innerHTML = "";
    }
  } catch (e) {
    videosSection.innerHTML = `<div class="error-message">Network or API error. Please check your API key and connection.</div>`;
    document.getElementById("recommended-list").innerHTML = "";
  }
}

// Fetch recommended videos using YouTube API's "search relatedToVideoId" feature
async function fetchAndDisplayRecommended(videoId) {
  const recommendedSection = document.getElementById("recommended-list");
  recommendedSection.innerHTML = "<span>Loading recommended...</span>";

  // The type=video parameter is REQUIRED for relatedToVideoId
  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&relatedToVideoId=${videoId}&key=${API_KEY}`;
  try {
    const resp = await fetch(endpoint);
    const data = await resp.json();

    if (data.error) {
      recommendedSection.innerHTML = `<div class="error-message">API Error: ${data.error.message}</div>`;
      return;
    }

    if (data.items && data.items.length > 0) {
      recommendedSection.innerHTML = data.items.map(createRecommendedCard).join("");
      setupRecommendedClick();
    } else {
      recommendedSection.innerHTML = "<div class='error-message'>No recommendations found.</div>";
    }
  } catch (e) {
    recommendedSection.innerHTML = `<div class="error-message">Network or API error. Please check your API key and connection.</div>`;
  }
}

// Set up click handlers for recommended videos
function setupRecommendedClick() {
  Array.from(document.querySelectorAll('.recommended-card')).forEach(card => {
    card.addEventListener('click', function() {
      const videoId = this.getAttribute('data-videoid');
      document.getElementById('searchInput').value = videoId;
      fetchAndDisplayVideo(videoId);
      window.scrollTo({top: 0, behavior: 'smooth'});
    });
  });
}

// Search button and Enter key
document.getElementById('searchBtn').addEventListener('click', () => {
  const videoId = document.getElementById('searchInput').value.trim();
  fetchAndDisplayVideo(videoId);
});

document.getElementById('searchInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});

// Optionally, load a default video at start
// fetchAndDisplayVideo("dQw4w9WgXcQ");