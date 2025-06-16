// You must provide your own YouTube Data API key.
const API_KEY = "AIzaSyBmWRgB4-2HXKkbSko1U5im_Ggzwn_fsFY";

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
      return;
    }

    if (data.items && data.items.length > 0) {
      const card = createVideoCard(data.items[0]);
      videosSection.innerHTML = card;
    } else {
      videosSection.innerHTML = `<div class="error-message">No video found for ID <code>${videoId}</code>.</div>`;
    }
  } catch (e) {
    videosSection.innerHTML = `<div class="error-message">Network or API error. Please check your API key and connection.</div>`;
  }
}

document.getElementById('searchBtn').addEventListener('click', () => {
  const videoId = document.getElementById('searchInput').value.trim();
  fetchAndDisplayVideo(videoId);
});

document.getElementById('searchInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});

// Optionally, you can load a default video at start
// fetchAndDisplayVideo("dQw4w9WgXcQ");