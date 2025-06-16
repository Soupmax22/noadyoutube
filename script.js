const API_KEY = "AIzaSyBmWRgB4-2HXKkbSko1U5im_Ggzwn_fsFY"; // <-- Replace with your YouTube Data API v3 key

document.getElementById('fetchBtn').addEventListener('click', () => {
  const videoId = document.getElementById('videoIdInput').value.trim();
  fetchVideoInfo(videoId);
});

async function fetchVideoInfo(videoId) {
  const resultDiv = document.getElementById('result');
  const errorP = document.getElementById('error');
  resultDiv.style.display = "none";
  errorP.textContent = "";

  if (!videoId) {
    errorP.textContent = "Please enter a video ID.";
    return;
  }

  const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
  try {
    const resp = await fetch(endpoint);
    const data = await resp.json();

    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      document.getElementById('title').textContent = snippet.title;
      document.getElementById('channel').textContent = snippet.channelTitle;
      document.getElementById('uploaded').textContent = (new Date(snippet.publishedAt)).toLocaleString();
      resultDiv.style.display = "block";
    } else {
      errorP.textContent = "Video not found or API error.";
    }
  } catch (e) {
    errorP.textContent = "Something went wrong. Check your API key and network.";
  }
}