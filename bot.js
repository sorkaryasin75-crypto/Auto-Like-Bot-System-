const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // অথেনটিক ব্রাউজার হিসেবে কাজ করানোর জন্য কাস্টম User-Agent
    const customUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    await page.setUserAgent(customUserAgent);
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('টার্গেট পেজে ভিজিট করা হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // এখানে আপনার সাইটের আসল লাইক বাটনের ক্লাস বা সিলেক্টর দিন
        const likeButtonSelector = '.like-btn'; 

        console.log('লাইক বাটন খোঁজা হচ্ছে...');
        await page.waitForSelector(likeButtonSelector, { timeout: 15000 });

        const likeButtons = await page.$$(likeButtonSelector);
        console.log(`মোট ${likeButtons.length} টি লাইক বাটন পাওয়া গেছে।`);

        for (let i = 0; i < likeButtons.length; i++) {
            await likeButtons[i].evaluate(el => el.scrollIntoView());
            
            // র্যান্ডম ১ থেকে ২ সেকেন্ড বিরতি (হিউম্যান বিহেভিয়ারের জন্য)
            const randomDelay = Math.floor(Math.random() * 1500) + 1000;
            await new Promise(resolve => setTimeout(resolve, randomDelay));

            await likeButtons[i].click();
            console.log(`পোস্ট #${i + 1} এ লাইক দেওয়া হয়েছে।`);
        }

        console.log('সব পোস্ট লাইক করা সম্পন্ন হয়েছে!');

    } catch (error) {
        console.error('সমস্যা বা এরর বিবরণ:', error.message);
    } finally {
        await browser.close();
    }
})();
