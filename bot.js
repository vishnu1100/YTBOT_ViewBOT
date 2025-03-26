const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

// Add stealth plugin to make detection harder
puppeteer.use(StealthPlugin());

// Configuration 
const CONFIG = {
    MAX_VIEWS: 1000,
    CHANNEL_URL: 'https://www.youtube.com/@TrapMallu/videos', // Replace with actual channel
    VIEW_LOG_PATH: path.join(__dirname, 'viewlog.txt'),
    PROXY_LIST: [
        // Add proxy list for further anonymity (optional)
        // 'ip:port:username:password'
    ]
};

// Enhanced human-like delay function
const humanDelay = async (min, max) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`🕒 Human-like wait: ${delay}ms`);
    return new Promise(resolve => setTimeout(resolve, delay));
};

// Random mouse movement simulation
const randomMouseMovement = async (page) => {
    console.log("🖱️ Simulating human-like mouse movements...");
    const { width, height } = await page.viewport();
    
    const movements = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < movements; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        
        await page.mouse.move(x, y, { steps: Math.random() * 5 + 2 });
        await humanDelay(300, 800);
    }
};

// Log video view
const logVideoView = async (videoTitle) => {
    const logEntry = `${new Date().toISOString()} - Viewed: ${videoTitle}\n`;
    await fs.appendFile(CONFIG.VIEW_LOG_PATH, logEntry);
};

// Retrieve video links from channel
const getChannelVideoLinks = async (page) => {
    await page.goto(CONFIG.CHANNEL_URL, { waitUntil: 'networkidle2' });
    
    // Wait for videos to load
    await page.waitForSelector('a#video-title-link');
    
    // Extract video links
    const videoLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a#video-title-link'));
        return links.map(link => link.href).slice(0, 50); // Limit to first 50 videos
    });
    
    return videoLinks;
};

// Main view bot function
const runViewBot = async () => {
    console.log("🚀 Starting YouTube View Bot");
    
    // Launch browser with advanced stealth
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-web-security'
        ],
        defaultViewport: {
            width: 1366,
            height: 768
        }
    });

    try {
        const page = await browser.newPage();
        
        // Randomize user agent and other browser fingerprints
        await page.setUserAgent(generateRandomUserAgent());
        
        // Get list of channel videos
        const videoLinks = await getChannelVideoLinks(page);
        
        // Track number of views
        let viewCount = 0;
        
        while (viewCount < CONFIG.MAX_VIEWS && videoLinks.length > 0) {
            // Randomly select a video
            const randomVideoIndex = Math.floor(Math.random() * videoLinks.length);
            const selectedVideoLink = videoLinks.splice(randomVideoIndex, 1)[0];
            
            console.log(`📺 Selected video: ${selectedVideoLink}`);
            
            // Navigate to video
            await page.goto(selectedVideoLink, { waitUntil: 'networkidle2' });
            
            // Human-like interaction
            await humanDelay(2000, 5000);
            await randomMouseMovement(page);
            
            // Get video title for logging
            const videoTitle = await page.title();
            
            // Play video
            try {
                await page.click('button.ytp-large-play-button', { delay: Math.random() * 500 });
            } catch {
                await page.keyboard.press('k'); // Fallback play method
            }
            
            // Random watch duration (30-180 seconds)
            const watchDuration = Math.floor(Math.random() * 150000) + 30000;
            await humanDelay(watchDuration, watchDuration + 10000);
            
            // Log the view
            await logVideoView(videoTitle);
            viewCount++;
            
            // Random interval between views (1-5 minutes)
            const nextViewDelay = Math.floor(Math.random() * 240000) + 60000;
            console.log(`⏳ Waiting ${nextViewDelay/1000} seconds before next view`);
            await humanDelay(nextViewDelay, nextViewDelay + 30000);
        }
        
        console.log(`✅ Completed ${viewCount} views`);
        await browser.close();
    } catch (error) {
        console.error("❌ View Bot Error:", error);
    }
};

// Generate realistic user agent
function generateRandomUserAgent() {
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    const platforms = ['Windows NT 10.0', 'Macintosh', 'X11'];
    
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/` + 
           `${Math.floor(Math.random() * 30) + 90}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 99)} Safari/537.36`;
}

// Execute the view bot
runViewBot().catch(console.error);