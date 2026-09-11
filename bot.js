const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
        // ১. লগইন পেজে যাওয়া
        console.log('[+] লগইন পেজে ভিজিট করা হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await delay(2000);

        // ২. লগইন ইনপুট
        console.log('[+] ইমেইল ও পাসওয়ার্ড দেওয়া হচ্ছে...');
        await page.waitForSelector('input[name="email"]', { visible: true });
        await page.type('input[name="email"]', EMAIL, { delay: 100 });

        await delay(1000);

        await page.waitForSelector('input[name="password"]', { visible: true });
        await page.type('input[name="password"]', PASSWORD, { delay: 120 });

        await delay(1500);

        // ৩. সাবমিট
        console.log('[+] লগইন সাবমিট করা হচ্ছে...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        console.log('[✓] সফলভাবে লগইন সম্পন্ন হয়েছে!');

        // ৪. ড্যাশবোর্ডে রিডাইরেক্ট
        console.log('[+] ড্যাশবোর্ডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', {
            waitUntil: 'networkidle2'
        });

        await delay(3000);

        let likedCount = 0;
        const processedButtons = new Set();

        console.log('[+] "লাভ" বাটন খোঁজা এবং স্ক্রোল করে অটো-লাইক প্রসেস শুরু হচ্ছে...');

        for (let scrollAttempt = 0; scrollAttempt < 15; scrollAttempt++) {
            // স্ক্রিনশটে থাকা "লাভ" লেখাটি সম্বলিত বাটন বা এলিমেন্ট খুঁজে বের করা
            const elements = await page.$$('div, button, a, span');
            
            for (let el of elements) {
                const text = await page.evaluate(element => element.innerText ? element.innerText.trim() : '', el);

                // যদি লেখার মধ্যে "লাভ" থাকে এবং এটি আগে ক্লিক না হয়ে থাকে
                if (text === 'লাভ' || text.includes('লাভ')) {
                    const isProcessed = await el.evaluate(node => node.getAttribute('data-bot-clicked'));
                    
                    if (!isProcessed) {
                        // ফ্ল্যাগ সেট করা যাতে একই বাটনে দুইবার ক্লিক না হয়
                        await el.evaluate(node => node.setAttribute('data-bot-clicked', 'true'));

                        // স্ক্রোল করে বাটনে যাওয়া
                        await el.evaluate(node => node.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                        
                        // হিউম্যান বিহেভিয়ার অনুযায়ী ১.৫ - ৩ সেকেন্ড র্যান্ডম বিরতি
                        const randomPause = Math.floor(Math.random() * 1500) + 1500;
                        await delay(randomPause);

                        await el.click();
                        likedCount++;
                        console.log(`[✓] পোস্ট #${likedCount} এর "লাভ" বাটনে ক্লিক করা হয়েছে।`);
                    }
                }
            }

            // নতুন পোস্ট লোডের জন্য ফেসবুকে যেভাবে স্ক্রোল করা হয়
            console.log('[+] আরও পোস্ট লোড করার জন্য স্ক্রোল করা হচ্ছে...');
            await page.evaluate('window.scrollBy(0, 800)');
            await delay(3000);
        }

        console.log(`[SUCCESS] সর্বমোট ${likedCount} টি পোস্টে সফলভাবে "লাভ" রিঅ্যাক্ট/লাইক দেওয়া হয়েছে!`);

    } catch (error) {
        console.error('[ERROR] প্রসেস চলাকালীন সমস্যা:', error.message);
    } finally {
        await browser.close();
        console.log('[+] ব্রাউজার সেশন বন্ধ করা হয়েছে।');
    }
})();
