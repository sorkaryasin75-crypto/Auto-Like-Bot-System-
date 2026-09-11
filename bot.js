const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// বট ডিটেকশন বাইপাস করার জন্য স্টিলথ প্লাগইন যুক্ত করা
puppeteer.use(StealthPlugin());

(async () => {
    // GitHub Secrets থেকে সুরক্ষিত ইমেইল ও পাসওয়ার্ড সংগ্রহ
    const EMAIL = process.env.SITE_EMAIL;
    const PASSWORD = process.env.SITE_PASSWORD;

    if (!EMAIL || !PASSWORD) {
        console.error('ERROR: SITE_EMAIL অথবা SITE_PASSWORD সেটিংসে পাওয়া যায়নি!');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();

    // অ্যাডভান্সড ইউজার এজেন্ট এবং ভিউপোর্ট
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // মানুষের মতো র্যান্ডম বিরতি নেওয়ার হেল্পার ফাংশন
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
        console.log('[+] সিকিউর লগইন পেজে ভিজিট করা হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await delay(2000);

        // ইমেইল ইনপুট বক্সে টাইপ করা (মানুষের টাইপিং স্পিড অনুকরণ করে)
        console.log('[+] ইমেইল ইনপুট দেওয়া হচ্ছে...');
        await page.waitForSelector('input[name="email"]', { visible: true });
        await page.type('input[name="email"]', EMAIL, { delay: 120 });

        await delay(1000);

        // পাসওয়ার্ড ইনপুট দেওয়া
        console.log('[+] পাসওয়ার্ড ইনপুট দেওয়া হচ্ছে...');
        await page.waitForSelector('input[name="password"]', { visible: true });
        await page.type('input[name="password"]', PASSWORD, { delay: 140 });

        await delay(1500);

        // লগইন বাটনে সাবমিট করা
        console.log('[+] লগইন বাটনে ক্লিক করা হচ্ছে...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        console.log('[✓] সফলভাবে লগইন সম্পন্ন হয়েছে!');

        // ড্যাশবোর্ডে রিডাইরেক্ট ও পোস্ট প্রসেসিং
        console.log('[+] ড্যাশবোর্ডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', {
            waitUntil: 'networkidle2'
        });

        await delay(3000);

        // লাইক বাটনের উপাদান সনাক্তকরণ
        const likeButtonSelector = '.like-btn'; // আপনার সাইটের আসল লাইক বাটন ক্লাস
        
        await page.waitForSelector(likeButtonSelector, { timeout: 15000 }).catch(() => {
            console.log('[-] কোনো লাইক বাটন পাওয়া যায়নি অথবা ড্যাশবোর্ড লোড হয়নি।');
        });

        const likeButtons = await page.$$(likeButtonSelector);
        console.log(`[+] মোট ${likeButtons.length} টি লাইক বাটন পাওয়া গেছে।`);

        // প্রতিটি পোস্ট স্মুথলি স্ক্রোল ও র্যান্ডম ইন্টারভালে ক্লিক করা
        for (let i = 0; i < likeButtons.length; i++) {
            await likeButtons[i].evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
            
            // ১.৫ থেকে ৩.৫ সেকেন্ডের র্যান্ডম ডিলে (বাইপাসের জন্য অত্যন্ত জরুরি)
            const randomPause = Math.floor(Math.random() * 2000) + 1500;
            await delay(randomPause);

            await likeButtons[i].click();
            console.log(`[✓] পোস্ট #${i + 1} সফলভাবে লাইক করা হয়েছে।`);
        }

        console.log('[SUCCESS] ড্যাশবোর্ডের সব পোস্টে অটো-লাইক সম্পূর্ণ হয়েছে!');

    } catch (error) {
        console.error('[ERROR] প্রসেস চলাকালীন সমস্যা:', error.message);
    } finally {
        await browser.close();
        console.log('[+] ব্রাউজার সেশন বন্ধ করা হয়েছে।');
    }
})();
