// Always use this YouTube Data API v3 key:
const API_KEY = "AIzaSyBmWRgB4-2HXKkbSko1U5im_Ggzwn_fsFY";

let nextPageToken = null;
let currentQuery = "";
let isLoading = false;
let seenVideoIds = new Set();

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
  const videoId = video.id.videoId || video.id;

  return `
    <div class="video-card" data-video-id="${videoId}">
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

// Show YouTube nocookie embed fullscreen overlay
function showVideoFullscreen(videoId) {
  // Create overlay if not present
  let overlay = document.getElementById('yt-fullscreen-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'yt-fullscreen-overlay';
    overlay.innerHTML = `
      <div id="yt-fullscreen-iframe-wrapper">
        <iframe id="yt-fullscreen-iframe" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
        <button id="yt-fullscreen-close">&times;</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Style overlay
    const style = document.createElement('style');
    style.textContent = `
      #yt-fullscreen-overlay {
        position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.96); z-index: 9999; display: flex; align-items: center; justify-content: center;
        transition: opacity 0.2s;
      }
      #yt-fullscreen-iframe-wrapper {
        position: relative; width: 90vw; height: 80vh; max-width:1280px; max-height: 720px; display: flex; align-items: center; justify-content: center;
      }
      #yt-fullscreen-iframe {
        width: 100%; height: 100%; border-radius: 12px; box-shadow: 0 4px 40px #000a;
        background: #000;
      }
      #yt-fullscreen-close {
        position: absolute; top: -30px; right: -30px; background: #111; color: #fff; border: none; border-radius: 50%; width: 48px; height: 48px;
        font-size: 32px; cursor: pointer; z-index: 10001; box-shadow: 0 2px 8px #0007;
        display: flex; align-items: center; justify-content: center;
      }
      @media (max-width: 800px) {
        #yt-fullscreen-iframe-wrapper { width: 100vw; height: 50vw; max-width: 100vw; max-height: 56vw; }
      }
      @media (max-width: 600px) {
        #yt-fullscreen-iframe-wrapper { width: 100vw; height: 56vw; }
      }
    `;
    document.head.appendChild(style);

    // Close on click
    overlay.querySelector('#yt-fullscreen-close').onclick = () => {
      overlay.style.display = 'none';
      overlay.querySelector('#yt-fullscreen-iframe').src = '';
    };

    // Close on overlay background click (but not iframe or button)
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        overlay.querySelector('#yt-fullscreen-iframe').src = '';
      }
    };
  }
  // Set iframe src and show overlay
  const iframe = overlay.querySelector('#yt-fullscreen-iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&fs=1`;
  overlay.style.display = 'flex';
}

// Fetches and displays at least 12 non-Shorts, non-duplicate videos, using multiple pages if needed
async function fetchAndDisplayVideos(query, append = false) {
  const videosSection = document.getElementById('videos');
  if (!append) {
    videosSection.innerHTML = "";
    nextPageToken = null;
    seenVideoIds = new Set();
  }
  if (!query) return;
  isLoading = true;

  let collectedVideos = [];
  let localNextPage = nextPageToken;
  let tries = 0;

  while (collectedVideos.length < 12 && tries < 8) {
    // YouTube API search: get a batch of results
    let endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    if (localNextPage) endpoint += `&pageToken=${localNextPage}`;

    const resp = await fetch(endpoint);
    const data = await resp.json();

    if (data.error) {
      if (!append && collectedVideos.length === 0) {
        videosSection.innerHTML = `<div class="error-message">API Error: ${data.error.message}</div>`;
      }
      isLoading = false;
      return;
    }

    if (!data.items || data.items.length === 0) break;

    // Get all video IDs in this batch
    const videoIds = data.items
      .map(video => video.id.videoId || video.id)
      .filter(Boolean);

    // Fetch details (duration) for all videos in this batch
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
    for (const video of data.items) {
      const vid = video.id.videoId || video.id;
      if (
        vid &&
        !seenVideoIds.has(vid) &&
        idToDuration[vid] > 60
      ) {
        collectedVideos.push(video);
        seenVideoIds.add(vid);
        if (collectedVideos.length === 12) break;
      }
    }

    localNextPage = data.nextPageToken || null;
    // Stop if no more pages
    if (!localNextPage) break;
    tries++;
  }

  nextPageToken = localNextPage || null;

  if (collectedVideos.length > 0) {
    const cards = collectedVideos.map(createVideoCard).join("");
    if (append) {
      videosSection.insertAdjacentHTML("beforeend", cards);
    } else {
      videosSection.innerHTML = cards;
    }

    // Attach click listeners for fullscreen embed
    Array.from(document.querySelectorAll('.video-card')).forEach(card => {
      card.onclick = () => {
        const vid = card.getAttribute('data-video-id');
        if (vid) showVideoFullscreen(vid);
      };
    });
  } else if (!append) {
    videosSection.innerHTML = `<div class="error-message">No non-Shorts videos found for "<b>${query}</b>".</div>`;
  }

  isLoading = false;
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

// Infinite scroll event
window.addEventListener('scroll', handleScroll);

// No autosearch!