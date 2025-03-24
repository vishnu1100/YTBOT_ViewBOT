const puppeteer = require('puppeteer');

// Helper function to simulate human delay with randomness
const humanDelay = async (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`Waiting for ${delay}ms like a human would...`);
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Helper for random mouse movements
const randomMouseMovement = async (page) => {
  console.log("Moving mouse randomly to appear human-like...");
  const viewportWidth = page.viewport().width;
  const viewportHeight = page.viewport().height;
  
  // Random number of movements (1-3)
  const movements = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < movements; i++) {
    const x = Math.floor(Math.random() * viewportWidth);
    const y = Math.floor(Math.random() * viewportHeight);
    await page.mouse.move(x, y);
    await humanDelay(300, 800);
  }
};

(async () => {
  console.log("Starting browser in stealth mode...");
  
  const browser = await puppeteer.launch({
    headless: true, // Hidden browser
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio', // Optional: mute audio
      '--disable-notifications'
    ]
  });
  
  console.log("Browser launched successfully");
  
  const page = await browser.newPage();
  
  // Set a realistic viewport
  await page.setViewport({ width: 1366, height: 768 });
  
  // Set a user agent to appear more like a regular browser
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
  
  console.log("Loading YouTube...");
  const youtubeURL = "https://www.youtube.com/watch?v=X2WXS9sVRsU";
  await page.goto(youtubeURL, { waitUntil: 'networkidle2' });
  console.log("YouTube loaded");
  
  // Human-like delay before interaction
  await humanDelay(2000, 4000);
  
  // Random mouse movement
  await randomMouseMovement(page);
  
  try {
    console.log("Looking for play button...");
    // Wait for the play button with a longer timeout since we're simulating human behavior
    await page.waitForSelector('button.ytp-large-play-button', { timeout: 8000 });
    console.log("Play button found, clicking...");
    
    // Add slight delay before clicking (humans don't click instantly)
    await humanDelay(800, 1500);
    
    await page.click('button.ytp-large-play-button');
    console.log("Clicked play button");
  } catch (error) {
    console.log("Play button not found or already playing, trying keyboard shortcut...");
  }
  
  // Another human-like delay before keyboard action
  await humanDelay(1000, 2000);
  
  // Press "k" to play/pause (YouTube shortcut)
  console.log("Pressing 'k' to ensure video playback...");
  await page.keyboard.press('k');
  
  // Wait some time to let video play
  console.log("Video should be playing now");
  await humanDelay(5000, 10000);
  
  // Simulate scrolling down a bit to view comments (like a human would)
  console.log("Scrolling down to view comments...");
  await page.evaluate(() => {
    window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
  });
  
  // Continue watching for a random period (10-30 seconds)
  const watchTime = Math.floor(Math.random() * 20000) + 10000;
  console.log(`Watching video for ${watchTime/1000} seconds...`);
  await humanDelay(watchTime, watchTime);
  
  console.log("Finished watching, closing browser...");
  await browser.close();
  console.log("Browser closed successfully");
})().catch(error => {
  console.error("An error occurred:", error);
});