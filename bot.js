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

    // GitHub Secrets থেকে নেওয়া মান (অথবা টেস্টের জন্য সরাসরি স্ট্রিং দিতে পারেন)
    const USERNAME = process.env.SITE_USERNAME || 'YOUR_USERNAME';
    const PASSWORD = process.env.SITE_PASSWORD || 'YOUR_PASSWORD';

    try {
        // ১. লগইন পেজে যাওয়া
        console.log('লগইন পেজে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', { // আপনার আসল লগইন ইউআরএল দিন
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // ২. ইউজারনেম ও পাসওয়ার্ড বক্সে ইনপুট দেওয়া
        console.log('লগইন তথ্য প্রদান করা হচ্ছে...');
        await page.waitForSelector('input[name="username"]'); // ইউজারনেম ফিল্ডের ইনপুট নাম/আইডি
        await page.type('input[name="username"]', USERNAME, { delay: 100 });

        await page.waitForSelector('input[name="password"]'); // পাসওয়ার্ড ফিল্ডের ইনপুট নাম/আইডি
        await page.type('input[name="password"]', PASSWORD, { delay: 100 });

        // ৩. লগইন বাটনে ক্লিক করা
        console.log('লগইন বাটনে ক্লিক করা হচ্ছে...');
        await Promise.all([
            page.click('button[type="submit"]'), // লগইন বাটনের সিলেক্টর
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        console.log('সফলভাবে লগইন করা হয়েছে!');

        // ৪. ড্যাশবোর্ডে গিয়ে লাইক প্রক্রিয়া শুরু
        console.log('ড্যাশবোর্ডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', {
            waitUntil: 'networkidle2'
        });

        const likeButtonSelector = '.like-btn'; // আপনার ওয়েবসাইটের লাইক বাটনের ক্লাস
        await page.waitForSelector(likeButtonSelector, { timeout: 15000 });

        const likeButtons = await page.$$(likeButtonSelector);
        console.log(`মোট ${likeButtons.length} টি লাইক বাটন পাওয়া গেছে।`);

        for (let i = 0; i < likeButtons.length; i++) {
            await likeButtons[i].evaluate(el => el.scrollIntoView());
            
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
