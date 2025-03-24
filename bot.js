const puppeteer = require('puppeteer');
const https = require('https');

// Configuration
const config = {
  // YouTube video URL to view
  youtubeURL: "https://www.youtube.com/watch?v=X2WXS9sVRsU",
  
  // Number of view attempts to make
  numberOfViews: 5,
  
  // Minimum time to watch video (in milliseconds)
  minViewTime: 35000, // 35 seconds
  
  // Maximum additional random time (in milliseconds)
  maxAdditionalTime: 30000, // Up to 30 more seconds
  
  // Wait time between attempts (in minutes)
  minWaitBetweenAttempts: 1,
  maxWaitBetweenAttempts: 3,
  
  // Multiple free proxy APIs to increase success rate
  proxyApis: [
    'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&filterUpTime=90&speed=fast&protocols=http%2Chttps',
    'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all&simplified=true'
  ],
  
  // Proxy connection timeout in milliseconds
  proxyTimeout: 10000,
  
  // User agents for browser fingerprinting
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0'
  ],
  
  // Maximum retries per view attempt
  maxRetries: 3
};

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

// Function to fetch free proxies from geonode API (JSON format)
const getGeonodeProxies = () => {
  return new Promise((resolve, reject) => {
    https.get(config.proxyApis[0], (resp) => {
      let data = '';
      
      resp.on('data', (chunk) => {
        data += chunk;
      });
      
      resp.on('end', () => {
        try {
          const proxyData = JSON.parse(data);
          if (proxyData && proxyData.data) {
            const proxies = proxyData.data.map(proxy => ({
              ip: proxy.ip,
              port: proxy.port,
              protocol: proxy.protocols[0].toLowerCase()
            }));
            console.log(`Retrieved ${proxies.length} proxies from geonode`);
            resolve(proxies);
          } else {
            console.log('Invalid proxy data format:', data);
            resolve([]);
          }
        } catch (e) {
          console.error('Error parsing proxy data:', e);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.log('Error retrieving proxies:', err.message);
      resolve([]);
    });
  });
};

// Function to fetch free proxies from proxyscrape API (plain text format)
const getProxyscrapeProxies = () => {
  return new Promise((resolve, reject) => {
    https.get(config.proxyApis[1], (resp) => {
      let data = '';
      
      resp.on('data', (chunk) => {
        data += chunk;
      });
      
      resp.on('end', () => {
        try {
          // Format: ip:port per line
          const lines = data.trim().split('\n');
          const proxies = lines.map(line => {
            const [ip, port] = line.trim().split(':');
            return {
              ip: ip,
              port: port,
              protocol: 'http'
            };
          }).filter(p => p.ip && p.port);
          
          console.log(`Retrieved ${proxies.length} proxies from proxyscrape`);
          resolve(proxies);
        } catch (e) {
          console.error('Error parsing proxyscrape data:', e);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.log('Error retrieving proxyscrape proxies:', err.message);
      resolve([]);
    });
  });
};

// Combined function to get proxies from multiple sources
const getAllProxies = async () => {
  const geonodeProxies = await getGeonodeProxies();
  const proxyscrapeProxies = await getProxyscrapeProxies();
  
  // Combine and deduplicate proxies
  const allProxies = [...geonodeProxies, ...proxyscrapeProxies];
  console.log(`Total proxies from all sources: ${allProxies.length}`);
  
  return allProxies;
};

// Function to test if a proxy is working
const testProxy = async (proxy) => {
  let browser;
  try {
    console.log(`Testing proxy: ${proxy.protocol}://${proxy.ip}:${proxy.port}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--proxy-server=${proxy.protocol}://${proxy.ip}:${proxy.port}`
      ]
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com', { 
      timeout: config.proxyTimeout,
      waitUntil: 'networkidle2'
    });
    
    console.log(`✅ Proxy ${proxy.ip}:${proxy.port} is working!`);
    return true;
  } catch (e) {
    console.log(`❌ Proxy ${proxy.ip}:${proxy.port} failed: ${e.message}`);
    return false;
  } finally {
    if (browser) await browser.close();
  }
};

// Function to find a working proxy
const getWorkingProxy = async (proxies) => {
  if (!proxies || proxies.length === 0) {
    return null;
  }
  
  // Try proxies one by one until we find one that works
  for (let i = 0; i < Math.min(proxies.length, 10); i++) {
    const randomIndex = Math.floor(Math.random() * proxies.length);
    const proxy = proxies[randomIndex];
    
    const isWorking = await testProxy(proxy);
    if (isWorking) {
      proxies.splice(randomIndex, 1); // Remove this proxy from the list
      return proxy;
    } else {
      proxies.splice(randomIndex, 1); // Remove non-working proxy
    }
  }
  
  return null; // No working proxy found
};

// Main function to watch YouTube video
const watchYouTubeVideo = async (proxy = null) => {
  let browser;
  
  try {
    console.log("Starting browser...");
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-notifications',
      '--disable-extensions',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ];
    
    // Add proxy if provided
    if (proxy) {
      console.log(`Using proxy: ${proxy.protocol}://${proxy.ip}:${proxy.port}`);
      args.push(`--proxy-server=${proxy.protocol}://${proxy.ip}:${proxy.port}`);
    } else {
      console.log("No proxy available, using direct connection");
    }
    
    browser = await puppeteer.launch({
      headless: true,
      args: args
    });
    
    console.log("Browser launched successfully");
    
    const page = await browser.newPage();
    
    // Set viewport size (like a real browser window)
    await page.setViewport({ width: 1366, height: 768 });
    
    // Randomize user agent
    const randomUserAgent = config.userAgents[Math.floor(Math.random() * config.userAgents.length)];
    await page.setUserAgent(randomUserAgent);
    console.log(`Using user agent: ${randomUserAgent}`);
    
    // Check our IP (to verify proxy is working if being used)
    if (proxy) {
      console.log("Checking IP address...");
      try {
        await page.goto('http://ip-api.com/json/', { 
          waitUntil: 'networkidle2',
          timeout: 15000
        });
        
        const ipData = await page.evaluate(() => {
          return document.body.textContent;
        });
        console.log(`Current IP info: ${ipData}`);
      } catch (error) {
        console.log(`Couldn't check IP address: ${error.message}`);
        // If we can't even reach the IP check site, the proxy is likely not working
        throw new Error('Proxy connection failed at IP check');
      }
    }
    
    console.log("Loading YouTube...");
    await page.goto(config.youtubeURL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    console.log("YouTube loaded");
    
    // Human-like delay before interaction
    await humanDelay(2000, 4000);
    
    // Random mouse movement
    await randomMouseMovement(page);
    
    // Maximize video quality on approximately 40% of views
    if (Math.random() > 0.6) {
      try {
        console.log("Attempting to adjust video quality for more realistic view...");
        await page.click('.ytp-settings-button');
        await humanDelay(800, 1200);
        
        // Click on quality menu item
        const qualityItems = await page.$$('.ytp-panel-menu .ytp-menuitem');
        for (const item of qualityItems) {
          const text = await item.evaluate(el => el.textContent);
          if (text.includes('Quality')) {
            await item.click();
            await humanDelay(800, 1200);
            break;
          }
        }
        
        // Select a quality (usually the top ones are highest)
        const menuItems = await page.$$('.ytp-quality-menu .ytp-menuitem');
        if (menuItems.length > 0) {
          // Choose from top 3 qualities (if available)
          const qualityIndex = Math.floor(Math.random() * Math.min(3, menuItems.length));
          await menuItems[qualityIndex].click();
          console.log("Adjusted video quality");
        }
      } catch (e) {
        console.log("Quality adjustment failed, continuing with default quality");
      }
    }
    
    try {
      console.log("Looking for play button...");
      await page.waitForSelector('button.ytp-large-play-button', { timeout: 8000 });
      console.log("Play button found, clicking...");
      
      await humanDelay(800, 1500);
      await page.click('button.ytp-large-play-button');
      console.log("Clicked play button");
    } catch (error) {
      console.log("Play button not found or already playing, trying keyboard shortcut...");
    }
    
    await humanDelay(1000, 2000);
    
    console.log("Pressing 'k' to ensure video playback...");
    await page.keyboard.press('k');
    
    console.log("Video should be playing now");
    
    // Take a screenshot to verify everything is working (optional)
    try {
      const screenshotPath = `youtube-view-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved to ${screenshotPath}`);
    } catch (err) {
      console.log("Could not save screenshot");
    }
    
    // Engage with video - volume adjustment (sometimes)
    if (Math.random() > 0.7) {
      console.log("Adjusting volume...");
      // Press up arrow a random number of times to increase volume
      const volumeAdjusts = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < volumeAdjusts; i++) {
        await page.keyboard.press('ArrowUp');
        await humanDelay(300, 500);
      }
    }
    
    // Wait for a random amount of time to count the view
    const additionalTime = Math.floor(Math.random() * config.maxAdditionalTime);
    const totalViewTime = config.minViewTime + additionalTime;
    
    console.log(`Watching video for ${totalViewTime/1000} seconds to count the view...`);
    await humanDelay(totalViewTime/2, totalViewTime/2);
    
    // Random interactions during viewing
    const interactionType = Math.random();
    if (interactionType > 0.6) {
      console.log("Simulating random interaction: scrolling to comments");
      await page.evaluate(() => {
        window.scrollBy(0, Math.floor(Math.random() * 500) + 300);
      });
      await humanDelay(2000, 5000);
    } else if (interactionType > 0.3) {
      console.log("Simulating random interaction: moving mouse over video");
      await randomMouseMovement(page);
    }
    
    // Continue watching the second half
    await humanDelay(totalViewTime/2, totalViewTime/2);
    
    console.log("Finished watching, closing browser");
    
    // Log completion timestamp
    console.log(`View completed at: ${new Date().toLocaleString()}`);
    
    return true;
  } catch (error) {
    console.error("An error occurred:", error);
    return false;
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
      console.log("Browser closed");
    }
  }
};

// Main execution function
(async () => {
  console.log("Starting YouTube view automation");
  console.log(`Target video: ${config.youtubeURL}`);
  console.log(`Planned view attempts: ${config.numberOfViews}`);
  
  // Fetch proxies once at the beginning
  let proxies = await getAllProxies();
  
  let successfulViews = 0;
  
  for (let i = 0; i < config.numberOfViews; i++) {
    console.log(`\n===== Starting view attempt ${i+1}/${config.numberOfViews} =====\n`);
    
    let success = false;
    let retries = 0;
    
    while (!success && retries < config.maxRetries) {
      if (retries > 0) {
        console.log(`Retry attempt ${retries}/${config.maxRetries}...`);
      }
      
      // Get a working proxy for this attempt
      let proxy = null;
      if (proxies.length > 0) {
        proxy = await getWorkingProxy(proxies);
      }
      
      // If we're running low on proxies, fetch more
      if (proxies.length < 5 && i < config.numberOfViews - 1) {
        console.log("Running low on proxies, fetching more...");
        const newProxies = await getAllProxies();
        proxies = [...proxies, ...newProxies];
      }
      
      // Try the view
      success = await watchYouTubeVideo(proxy);
      
      if (success) {
        successfulViews++;
        console.log(`View successful! (${successfulViews}/${i+1} attempts successful so far)`);
      } else {
        retries++;
        // If we failed with a proxy, try again without one
        if (proxy && retries === config.maxRetries - 1) {
          console.log("All proxy attempts failed. Trying direct connection as last resort...");
          success = await watchYouTubeVideo();
          if (success) {
            successfulViews++;
            console.log(`Direct connection view successful! (${successfulViews}/${i+1} attempts successful so far)`);
          }
        }
      }
    }
    
    // Wait between attempts
    if (i < config.numberOfViews - 1) {
      const waitMinutes = Math.floor(Math.random() * 
        (config.maxWaitBetweenAttempts - config.minWaitBetweenAttempts + 1)) + 
        config.minWaitBetweenAttempts;
      const waitTime = waitMinutes * 60 * 1000;
      console.log(`Waiting ${waitMinutes} minutes before next view attempt...`);
      await humanDelay(waitTime, waitTime);
    }
  }
  
  console.log(`\n===== All view attempts completed! =====`);
  console.log(`Total successful views: ${successfulViews}/${config.numberOfViews}`);
  console.log(`Success rate: ${(successfulViews/config.numberOfViews*100).toFixed(1)}%`);
})().catch(err => {
  console.error("Fatal error in main process:", err);
});